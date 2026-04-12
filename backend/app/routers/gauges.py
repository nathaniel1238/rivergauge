from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Gauge, Reading

router = APIRouter(prefix="/gauges", tags=["gauges"])

RANGE_HOURS: dict[str, int] = {
    "24h": 24,
    "7d": 7 * 24,
    "30d": 30 * 24,
    "3m": 90 * 24,
}
SPARKLINE_POINTS = 60
DETAIL_POINTS = 1000  # higher resolution for the detail chart


def _online_state(last_updated_at: Optional[datetime]) -> str:
    if last_updated_at is None:
        return "offline"
    ts = last_updated_at if last_updated_at.tzinfo else last_updated_at.replace(tzinfo=timezone.utc)
    return "online" if (datetime.now(timezone.utc) - ts).total_seconds() < 3600 else "offline"


def _minutes_ago(last_updated_at: Optional[datetime]) -> Optional[int]:
    if last_updated_at is None:
        return None
    ts = last_updated_at if last_updated_at.tzinfo else last_updated_at.replace(tzinfo=timezone.utc)
    return max(0, int((datetime.now(timezone.utc) - ts).total_seconds() / 60))


@router.get("")
async def list_gauges(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Gauge).order_by(Gauge.device_id))
    gauges = result.scalars().all()
    return [
        {
            "id": g.id,
            "device_id": g.device_id,
            "name": g.name,
            "town_state": g.town_state,
            "last_updated_at": g.last_updated_at.isoformat() if g.last_updated_at else None,
            "minutes_ago": _minutes_ago(g.last_updated_at),
            "battery_state": g.battery_state or "unknown",
            "online_state": _online_state(g.last_updated_at),
        }
        for g in gauges
    ]


@router.get("/{gauge_id}")
async def get_gauge(gauge_id: int, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(Gauge).where(Gauge.id == gauge_id))
    g = result.scalar_one_or_none()
    if g is None:
        raise HTTPException(status_code=404, detail="Gauge not found")
    return {
        "id": g.id,
        "device_id": g.device_id,
        "name": g.name,
        "town_state": g.town_state,
        "last_updated_at": g.last_updated_at.isoformat() if g.last_updated_at else None,
        "minutes_ago": _minutes_ago(g.last_updated_at),
        "battery_state": g.battery_state or "unknown",
        "online_state": _online_state(g.last_updated_at),
    }


@router.get("/{gauge_id}/readings")
async def get_readings(
    gauge_id: int,
    range: str = Query("24h", description="24h | 7d | 30d | 3m"),
    limit: int = Query(SPARKLINE_POINTS, ge=10, le=DETAIL_POINTS),
    db: AsyncSession = Depends(get_db),
):
    hours = RANGE_HOURS.get(range, 24)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    result = await db.execute(
        select(Reading)
        .where(Reading.gauge_id == gauge_id, Reading.ts >= since)
        .order_by(Reading.ts)
    )
    rows = result.scalars().all()

    # uniform downsample to requested limit
    if len(rows) > limit:
        step = max(1, len(rows) // limit)
        rows = rows[::step]

    return [
        {
            "ts": r.ts.isoformat(),
            "water_level_in": r.water_level_in,
            "water_depth_cm": r.water_depth_cm,
            "battery_mv": r.battery_mv,
            "battery_state": r.battery_state,
            "pressure_pa": r.pressure_pa,
        }
        for r in rows
    ]
