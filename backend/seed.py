"""
Seed script: creates 6 gauge rows and generates 90 days of realistic
water-level readings at 30-minute intervals.

Run:
    cd backend
    python seed.py
"""
import asyncio
import math
import random
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings, get_battery_state
from app.database import Base
from app.models import Gauge, Reading

# ── Gauge definitions (match reference image exactly) ─────────────────────────
GAUGES = [
    {"device_id": 1, "name": "Sandy River - Site 1",        "town_state": "Farmington, ME",  "minutes_ago": 2,  "battery_mv": 3850},
    {"device_id": 2, "name": "Carrabassett River - Site 2", "town_state": "Kingfield, ME",   "minutes_ago": 6,  "battery_mv": 3550},
    {"device_id": 3, "name": "Penobscot River - Site 3",    "town_state": "Millinocket, ME", "minutes_ago": 18, "battery_mv": 3780},
    {"device_id": 4, "name": "Saco River - Site 4",         "town_state": "Fryeburg, ME",    "minutes_ago": 3,  "battery_mv": 3920},
    {"device_id": 5, "name": "Androscoggin River - Site 5", "town_state": "Rumford, ME",     "minutes_ago": 9,  "battery_mv": 3250},
    {"device_id": 6, "name": "Merrimack River - Site 6",    "town_state": "Concord, NH",     "minutes_ago": 4,  "battery_mv": 3720},
]

# ── Per-gauge water-level profiles (inches) ───────────────────────────────────
# (base_in, daily_amp, weekly_amp, noise_amp, phase_offset)
PROFILES = [
    (54.0, 3.0,  8.0,  1.2, 0.0),   # Sandy River
    (36.0, 2.0,  5.5,  0.8, 1.1),   # Carrabassett
    (96.0, 5.0, 12.0,  2.0, 2.1),   # Penobscot (large)
    (48.0, 2.5,  7.0,  0.9, 0.5),   # Saco
    (72.0, 4.0, 10.0,  1.5, 1.8),   # Androscoggin
    (60.0, 3.5,  9.0,  1.0, 2.7),   # Merrimack
]

INTERVAL_MIN = 30
DAYS = 90
NUM_POINTS = DAYS * 24 * (60 // INTERVAL_MIN)  # 4320


def _water_level(profile, step: int, total: int) -> float:
    base, d_amp, w_amp, noise_amp, phase = profile
    t = step / max(total, 1)
    daily  = d_amp * math.sin(2 * math.pi * step / (24 * 2) + phase)
    weekly = w_amp * math.sin(2 * math.pi * step / (7 * 24 * 2) + phase)
    trend  = -base * 0.03 * t          # very slight long-term decline
    noise  = random.gauss(0, noise_amp)
    return max(0.5, base + daily + weekly + trend + noise)


async def run():
    random.seed(42)
    engine = create_async_engine(settings.database_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    now = datetime.now(timezone.utc)

    async with Session() as session:
        # ── Check if already seeded ──────────────────────────────────────────
        existing = await session.execute(select(Gauge))
        if existing.scalars().first() is not None:
            print("Database already seeded. Delete rows and re-run to reseed.")
            return

        # ── Insert gauges ────────────────────────────────────────────────────
        gauge_objs: list[Gauge] = []
        for gd in GAUGES:
            bstate = get_battery_state(gd["battery_mv"])
            last_up = now - timedelta(minutes=gd["minutes_ago"])
            g = Gauge(
                device_id=gd["device_id"],
                name=gd["name"],
                town_state=gd["town_state"],
                last_updated_at=last_up,
                battery_state=bstate,
            )
            session.add(g)
            gauge_objs.append(g)

        await session.flush()  # assigns IDs

        # ── Insert readings (bulk) ───────────────────────────────────────────
        for idx, g in enumerate(gauge_objs):
            profile = PROFILES[idx]
            batt_mv = GAUGES[idx]["battery_mv"]
            batt_state = get_battery_state(batt_mv)
            rows = []
            for step in range(NUM_POINTS, 0, -1):
                ts = now - timedelta(minutes=INTERVAL_MIN * step)
                wl_in = _water_level(profile, NUM_POINTS - step, NUM_POINTS)
                wl_cm = wl_in * 2.54
                pressure = 101325.0 + wl_cm * 98.0665
                rows.append(
                    {
                        "gauge_id": g.id,
                        "ts": ts,
                        "sequence_num": NUM_POINTS - step + 1,
                        "pressure_pa": round(pressure, 2),
                        "water_depth_cm": round(wl_cm, 4),
                        "water_level_in": round(wl_in, 4),
                        "battery_mv": batt_mv + random.randint(-15, 15),
                        "battery_state": batt_state,
                        "status_flags": 0,
                        "raw_payload_b64": "",
                    }
                )

            # chunked bulk insert to avoid huge parameter lists
            chunk = 500
            for i in range(0, len(rows), chunk):
                await session.execute(Reading.__table__.insert(), rows[i : i + chunk])

            print(f"  Inserted {len(rows)} readings for {g.name}")

        await session.commit()
        print("Seed complete ✓")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
