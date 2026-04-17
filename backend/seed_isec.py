"""
Seed script: Pre-seeds the ISEC Demo Sensor gauge (device_id=13) at
Northeastern University's ISEC building in Boston, MA.

Idempotent — safe to re-run. Upserts by device_id:
  - If gauge exists, updates name/location/coords
  - If not, creates it

IMPORTANT: The device_id (13) must match the first 4 bytes of the sensor's
20-byte payload. Verify in ChirpStack → Application → Devices → Frame Log
on first transmission, and update this script + re-run if needed.

How to run:
  Local:
      cd backend
      .venv/bin/python seed_isec.py

  Railway (production):
      DATABASE_URL="postgresql://user:pass@host:port/db?ssl=require" \\
          .venv/bin/python seed_isec.py
"""
import asyncio
import os
from datetime import datetime, timezone

# Normalize DATABASE_URL before app modules import it at module level.
_raw_url = os.environ.get("DATABASE_URL", "")
for _old, _new in [("postgres://", "postgresql+asyncpg://"), ("postgresql://", "postgresql+asyncpg://")]:
    if _raw_url.startswith(_old) and "+asyncpg" not in _raw_url:
        os.environ["DATABASE_URL"] = _raw_url.replace(_old, _new, 1)
        break

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.database import Base

ISEC_GAUGE = {
    "device_id":    13,                 # ← UPDATE to match actual sensor firmware device_id
    "name":         "ISEC Demo Sensor",
    "town_state":   "Boston, MA",
    "latitude":     42.3377,
    "longitude":    -71.0869,
    "battery_state": "healthy",
    "featured":     True,
}


async def run():
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://river:river@localhost:5432/river_gauge",
    )

    for prefix, replacement in [
        ("postgres://",    "postgresql+asyncpg://"),
        ("postgresql://",  "postgresql+asyncpg://"),
    ]:
        if db_url.startswith(prefix) and "+asyncpg" not in db_url:
            db_url = db_url.replace(prefix, replacement, 1)
            break

    is_local    = "localhost" in db_url or "127.0.0.1" in db_url
    is_internal = "railway.internal" in db_url
    connect_args: dict = {}
    if not is_local and not is_internal and "ssl=" not in db_url:
        connect_args = {"ssl": "require"}

    engine = create_async_engine(db_url, echo=False, connect_args=connect_args)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        now = datetime.now(timezone.utc)

        # Check if gauge already exists
        result = await session.execute(
            text("SELECT id FROM gauges WHERE device_id = :did"),
            {"did": ISEC_GAUGE["device_id"]},
        )
        row = result.fetchone()

        if row:
            gauge_id = row[0]
            await session.execute(
                text("""
                    UPDATE gauges
                    SET name = :name,
                        town_state = :town_state,
                        latitude = :lat,
                        longitude = :lng,
                        battery_state = :batt,
                        last_updated_at = :ts,
                        featured = :featured
                    WHERE id = :id
                """),
                {
                    "name":       ISEC_GAUGE["name"],
                    "town_state": ISEC_GAUGE["town_state"],
                    "lat":        ISEC_GAUGE["latitude"],
                    "lng":        ISEC_GAUGE["longitude"],
                    "batt":       ISEC_GAUGE["battery_state"],
                    "ts":         now,
                    "featured":   ISEC_GAUGE["featured"],
                    "id":         gauge_id,
                },
            )
            await session.commit()
            print(f"Updated existing gauge id={gauge_id}: {ISEC_GAUGE['name']} (device_id={ISEC_GAUGE['device_id']})")
        else:
            await session.execute(
                text("""
                    INSERT INTO gauges
                        (device_id, name, town_state, latitude, longitude,
                         battery_state, featured, last_updated_at, created_at)
                    VALUES
                        (:did, :name, :town_state, :lat, :lng,
                         :batt, :featured, :ts, :ts)
                """),
                {
                    "did":        ISEC_GAUGE["device_id"],
                    "name":       ISEC_GAUGE["name"],
                    "town_state": ISEC_GAUGE["town_state"],
                    "lat":        ISEC_GAUGE["latitude"],
                    "lng":        ISEC_GAUGE["longitude"],
                    "batt":       ISEC_GAUGE["battery_state"],
                    "featured":   ISEC_GAUGE["featured"],
                    "ts":         now,
                },
            )
            await session.commit()
            result2 = await session.execute(
                text("SELECT id FROM gauges WHERE device_id = :did"),
                {"did": ISEC_GAUGE["device_id"]},
            )
            gauge_id = result2.fetchone()[0]
            print(f"Created new gauge id={gauge_id}: {ISEC_GAUGE['name']} (device_id={ISEC_GAUGE['device_id']})")

        print(f"  Location: {ISEC_GAUGE['town_state']} ({ISEC_GAUGE['latitude']}, {ISEC_GAUGE['longitude']})")
        print(f"  Battery:  {ISEC_GAUGE['battery_state']}")
        print(f"  No readings seeded — waiting for live sensor transmissions")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
