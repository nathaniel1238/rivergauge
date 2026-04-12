import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_battery_state
from app.database import get_db
from app.decoder import decode_chirpstack_body
from app.models import Gauge, Reading

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/chirpstack", status_code=201)
async def ingest_chirpstack(body: dict, db: AsyncSession = Depends(get_db)):
    """
    Accept a ChirpStack HTTP integration uplink event.
    Parses the 18-byte packed payload, creates/updates the gauge row,
    and inserts a reading row (idempotent on device_id + sequence_num).
    """
    # ── Decode payload ──────────────────────────────────────────────────────
    try:
        decoded, raw_b64 = decode_chirpstack_body(body)
    except ValueError as exc:
        logger.warning("Payload decode failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))

    device_id: int = decoded["device_id"]

    # ── Resolve / auto-create gauge ─────────────────────────────────────────
    result = await db.execute(select(Gauge).where(Gauge.device_id == device_id))
    gauge = result.scalar_one_or_none()

    if gauge is None:
        device_info = body.get("deviceInfo", {})
        name = device_info.get("deviceName") or f"Device {device_id}"
        gauge = Gauge(device_id=device_id, name=name)
        db.add(gauge)
        await db.flush()  # populate gauge.id

    # ── Resolve timestamp (use ChirpStack receive time if available) ─────────
    chirpstack_time = body.get("time")
    if chirpstack_time:
        try:
            ts = datetime.fromisoformat(chirpstack_time.replace("Z", "+00:00"))
        except ValueError:
            ts = datetime.now(timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    # ── Idempotency check ────────────────────────────────────────────────────
    dup = await db.execute(
        select(Reading).where(
            Reading.gauge_id == gauge.id,
            Reading.sequence_num == decoded["sequence_num"],
        )
    )
    if dup.scalar_one_or_none() is not None:
        return {"status": "duplicate", "device_id": device_id}

    # ── Persist reading ──────────────────────────────────────────────────────
    battery_state = get_battery_state(decoded["battery_mv"])

    reading = Reading(
        gauge_id=gauge.id,
        ts=ts,
        sequence_num=decoded["sequence_num"],
        pressure_pa=decoded["pressure_pa"],
        water_depth_cm=decoded["water_depth_cm"],
        water_level_in=decoded["water_level_in"],
        battery_mv=decoded["battery_mv"],
        battery_state=battery_state,
        status_flags=decoded["status_flags"],
        raw_payload_b64=raw_b64,
    )
    db.add(reading)

    # ── Update gauge metadata ────────────────────────────────────────────────
    gauge.last_updated_at = ts
    gauge.battery_state = battery_state

    await db.commit()

    return {
        "status": "ok",
        "device_id": device_id,
        "sequence_num": decoded["sequence_num"],
        "water_level_in": round(decoded["water_level_in"], 3),
        "battery_state": battery_state,
    }
