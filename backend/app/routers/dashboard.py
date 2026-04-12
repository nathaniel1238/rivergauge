from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Gauge, Reading

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

RANGE_HOURS: dict[str, int] = {
    "24h": 24,
    "7d": 7 * 24,
    "30d": 30 * 24,
    "3m": 90 * 24,
}
SPARKLINE_POINTS = 60


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
async def get_dashboard(
    range: str = Query("24h", description="24h | 7d | 30d | 3m"),
    db: AsyncSession = Depends(get_db),
):
    """
    Single endpoint for the dashboard: returns all gauges with metadata
    and a downsampled sparkline for the requested time range.
    """
    hours = RANGE_HOURS.get(range, 24)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    gauges_result = await db.execute(select(Gauge).order_by(Gauge.device_id))
    gauges = gauges_result.scalars().all()

    output = []
    for g in gauges:
        readings_result = await db.execute(
            select(Reading.ts, Reading.water_level_in)
            .where(Reading.gauge_id == g.id, Reading.ts >= since)
            .order_by(Reading.ts)
        )
        rows = readings_result.fetchall()

        # Downsample to ~60 pts
        if len(rows) > SPARKLINE_POINTS:
            step = max(1, len(rows) // SPARKLINE_POINTS)
            rows = rows[::step]

        sparkline = [
            {"ts": r.ts.isoformat(), "y": round(r.water_level_in, 3)}
            for r in rows
        ]

        output.append(
            {
                "id": g.id,
                "device_id": g.device_id,
                "name": g.name,
                "town_state": g.town_state,
                "last_updated_at": g.last_updated_at.isoformat() if g.last_updated_at else None,
                "minutes_ago": _minutes_ago(g.last_updated_at),
                "battery_state": g.battery_state or "unknown",
                "online_state": _online_state(g.last_updated_at),
                "sparkline": sparkline,
            }
        )

    return output
