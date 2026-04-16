"""
Seed script: 12 real Maine river gauges with 90 days of realistic spring runoff
data (Jan 15 → Apr 15, 2026) at 30-minute intervals — 51,840 readings total.

Water level model:
  wl = base + (peak - base) × spring_curve(t)   ← long-term seasonal trend
     + diurnal_melt_oscillation                  ← daily snowmelt cycle
     + rain_spike(t)                             ← 4–6 rain events per gauge
     + gauss(0, σ)                               ← sensor noise

spring_curve(t), t ∈ [0, 1] (Jan 15 → Apr 15):
  t < 0.35:          near-zero, frozen ground / ice cover
  0.35 ≤ t < 0.72:  quadratic rise (snowmelt acceleration)
  t ≥ 0.72:         sinusoidal plateau peaking early April, slight recession

How to run:
  Option A (Railway CLI — no SSL config needed):
      railway run python seed_maine.py

  Option B (external URL):
      DATABASE_URL="postgresql+asyncpg://user:pass@host:port/db?ssl=require" \\
          python seed_maine.py
"""
import asyncio
import math
import os
import random
from datetime import datetime, timezone, timedelta

# Normalize DATABASE_URL *before* app modules import it at module level.
# app/database.py creates an engine on import, so it must see the asyncpg URL.
_raw_url = os.environ.get("DATABASE_URL", "")
for _old, _new in [("postgres://", "postgresql+asyncpg://"), ("postgresql://", "postgresql+asyncpg://")]:
    if _raw_url.startswith(_old) and "+asyncpg" not in _raw_url:
        os.environ["DATABASE_URL"] = _raw_url.replace(_old, _new, 1)
        break

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import get_battery_state
from app.database import Base
from app.models import Gauge, Reading

# ── Constants ─────────────────────────────────────────────────────────────────
INTERVAL_MIN     = 30
NUM_DAYS         = 90
READINGS_PER_DAY = 24 * 60 // INTERVAL_MIN   # 48
NUM_POINTS       = NUM_DAYS * READINGS_PER_DAY  # 4 320
CHUNK_SIZE       = 500

# Jan 15, 2026 00:00 UTC  →  Apr 15, 2026 (last step ≈ Apr 14 23:30 UTC)
START_TS = datetime(2026, 1, 15, 0, 0, 0, tzinfo=timezone.utc)

# ── Gauge definitions ─────────────────────────────────────────────────────────
# daily_drain_mv: average battery drop per day (mV) — affects end-of-period state
GAUGES = [
    {"device_id":  1, "name": "Sandy River",        "town_state": "Farmington, ME",   "base_in":  4.2, "peak_in":  19.5, "battery_start": 3850, "daily_drain": 1.5, "lat": 44.6706, "lng": -70.1509},
    {"device_id":  2, "name": "Carrabassett River",  "town_state": "Kingfield, ME",    "base_in":  5.8, "peak_in":  26.4, "battery_start": 3760, "daily_drain": 1.8, "lat": 44.9598, "lng": -70.1534},
    {"device_id":  3, "name": "Penobscot River",     "town_state": "Millinocket, ME",  "base_in": 22.4, "peak_in":  88.6, "battery_start": 3920, "daily_drain": 1.2, "lat": 45.6573, "lng": -68.7071},
    {"device_id":  4, "name": "Saco River",          "town_state": "Fryeburg, ME",     "base_in": 11.3, "peak_in":  47.2, "battery_start": 3540, "daily_drain": 2.1, "lat": 44.0156, "lng": -70.9870},
    {"device_id":  5, "name": "Androscoggin River",  "town_state": "Rumford, ME",      "base_in": 18.7, "peak_in":  64.3, "battery_start": 3880, "daily_drain": 1.4, "lat": 44.5534, "lng": -70.5509},
    {"device_id":  6, "name": "Kennebec River",      "town_state": "Bingham, ME",      "base_in": 14.6, "peak_in":  58.1, "battery_start": 3710, "daily_drain": 1.6, "lat": 45.0584, "lng": -69.8789},
    {"device_id":  7, "name": "Aroostook River",     "town_state": "Caribou, ME",      "base_in":  8.9, "peak_in":  35.7, "battery_start": 3460, "daily_drain": 2.5, "lat": 46.8600, "lng": -68.0119},
    {"device_id":  8, "name": "St. Croix River",     "town_state": "Calais, ME",       "base_in":  9.4, "peak_in":  38.2, "battery_start": 3290, "daily_drain": 3.0, "lat": 45.1887, "lng": -67.2774},
    {"device_id":  9, "name": "Machias River",       "town_state": "Whitneyville, ME", "base_in":  3.8, "peak_in":  17.4, "battery_start": 3830, "daily_drain": 1.3, "lat": 44.7356, "lng": -67.5959},
    {"device_id": 10, "name": "Union River",         "town_state": "Ellsworth, ME",    "base_in":  5.1, "peak_in":  22.8, "battery_start": 3780, "daily_drain": 1.7, "lat": 44.5434, "lng": -68.4195},
    {"device_id": 11, "name": "Narraguagus River",   "town_state": "Cherryfield, ME",  "base_in":  3.2, "peak_in":  14.9, "battery_start": 3620, "daily_drain": 2.3, "lat": 44.5998, "lng": -67.9357},
    {"device_id": 12, "name": "Sheepscot River",     "town_state": "Whitefield, ME",   "base_in":  4.7, "peak_in":  20.1, "battery_start": 3750, "daily_drain": 1.9, "lat": 44.1584, "lng": -69.5609},
]


# ── Water level model ─────────────────────────────────────────────────────────

def spring_curve(t: float) -> float:
    """0–1 runoff fraction for t ∈ [0, 1] (Jan 15 → Apr 15)."""
    if t < 0.35:
        # frozen: tiny linear creep
        return 0.02 * (t / 0.35)
    elif t < 0.72:
        # quadratic acceleration through snowmelt
        u = (t - 0.35) / (0.72 - 0.35)
        return 0.02 + 0.78 * (u ** 2)
    else:
        # sinusoidal plateau — peaks ~Apr 1, gentle recession to Apr 15
        u = (t - 0.72) / (1.0 - 0.72)
        return 0.80 + 0.15 * math.sin(math.pi * u)


def make_rain_events(gauge_id: int, base_in: float, peak_in: float) -> list:
    """
    Generate 4–6 rain spike events, seeded deterministically by gauge_id.
    Each event: (start_day, duration_days, magnitude_inches).
    """
    rng = random.Random(gauge_id * 17 + 42)
    events = []
    for _ in range(rng.randint(4, 6)):
        start_day = rng.randint(10, NUM_DAYS - 10)
        duration  = rng.randint(2, 4)
        magnitude = rng.uniform(0.15, 0.50) * (peak_in - base_in)
        events.append((start_day, duration, magnitude))
    return events


def rain_spike(day: float, events: list) -> float:
    """Sum of active rain contributions at fractional day `day`."""
    total = 0.0
    for start_day, duration, magnitude in events:
        if start_day <= day < start_day + duration:
            frac = 1.0 - (day - start_day) / duration   # linear decay
            total += magnitude * frac
    return total


def compute_water_level(step: int, base_in: float, peak_in: float, events: list) -> float:
    t   = step / (NUM_POINTS - 1)
    day = step / READINGS_PER_DAY

    sc    = spring_curve(t)
    trend = base_in + (peak_in - base_in) * sc

    # diurnal snowmelt cycle — amplitude scales with melt intensity
    melt_intensity = max(0.0, (sc - 0.10) / 0.90)
    daily_amp      = 0.04 * (peak_in - base_in) * melt_intensity
    # phase −π/2 so daily minimum is at midnight, maximum mid-afternoon
    diurnal = daily_amp * math.sin(
        2 * math.pi * (step % READINGS_PER_DAY) / READINGS_PER_DAY - math.pi / 2
    )

    rain  = rain_spike(day, events)
    noise = random.gauss(0, 0.012 * (peak_in - base_in))

    return max(base_in * 0.75, trend + diurnal + rain + noise)


# ── Main ──────────────────────────────────────────────────────────────────────

async def run():
    # Resolve DATABASE_URL
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://river:river@localhost:5432/river_gauge",
    )

    # Normalize driver prefix
    for prefix, replacement in [
        ("postgres://",        "postgresql+asyncpg://"),
        ("postgresql://",      "postgresql+asyncpg://"),
    ]:
        if db_url.startswith(prefix) and "+asyncpg" not in db_url:
            db_url = db_url.replace(prefix, replacement, 1)
            break

    # Add SSL for non-local, non-internal URLs
    is_local    = "localhost" in db_url or "127.0.0.1" in db_url
    is_internal = "railway.internal" in db_url
    connect_args: dict = {}
    if not is_local and not is_internal and "ssl=" not in db_url:
        connect_args = {"ssl": "require"}

    engine  = create_async_engine(db_url, echo=False, connect_args=connect_args)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    random.seed(99)   # reproducible noise across all gauges

    async with Session() as session:
        # ── Clean slate ──────────────────────────────────────────────────────
        print("Clearing existing data …")
        await session.execute(text("DELETE FROM alert_notifications"))
        await session.execute(text("DELETE FROM alert_subscriptions"))
        await session.execute(text("DELETE FROM readings"))
        await session.execute(text("DELETE FROM gauges"))
        await session.commit()

        # ── Insert gauges ────────────────────────────────────────────────────
        last_reading_ts = START_TS + timedelta(minutes=INTERVAL_MIN * (NUM_POINTS - 1))
        gauge_objs: list[Gauge] = []

        for gd in GAUGES:
            # Battery state at end of 90-day period
            batt_final = max(2800, int(gd["battery_start"] - gd["daily_drain"] * NUM_DAYS))
            g = Gauge(
                device_id=gd["device_id"],
                name=gd["name"],
                town_state=gd["town_state"],
                last_updated_at=last_reading_ts,
                battery_state=get_battery_state(batt_final),
                latitude=gd["lat"],
                longitude=gd["lng"],
            )
            session.add(g)
            gauge_objs.append(g)

        await session.flush()   # assigns DB ids

        # ── Insert readings (bulk, chunked) ───────────────────────────────────
        total_readings = 0
        drain_per_step = {
            gd["device_id"]: gd["daily_drain"] / READINGS_PER_DAY
            for gd in GAUGES
        }

        for g, gd in zip(gauge_objs, GAUGES):
            base_in     = gd["base_in"]
            peak_in     = gd["peak_in"]
            batt_start  = gd["battery_start"]
            dps         = drain_per_step[gd["device_id"]]
            events      = make_rain_events(gd["device_id"], base_in, peak_in)

            rows = []
            for step in range(NUM_POINTS):
                ts    = START_TS + timedelta(minutes=INTERVAL_MIN * step)
                wl_in = compute_water_level(step, base_in, peak_in, events)
                wl_cm = wl_in * 2.54
                batt  = max(2800, int(batt_start - dps * step + random.gauss(0, 15)))
                rows.append({
                    "gauge_id":        g.id,
                    "ts":              ts,
                    "sequence_num":    step + 1,
                    "pressure_pa":     round(101325.0 + wl_cm * 98.0665, 2),
                    "water_depth_cm":  round(wl_cm, 4),
                    "water_level_in":  round(wl_in, 4),
                    "battery_mv":      batt,
                    "battery_state":   get_battery_state(batt),
                    "status_flags":    0,
                    "raw_payload_b64": "",
                })

            for i in range(0, len(rows), CHUNK_SIZE):
                await session.execute(Reading.__table__.insert(), rows[i : i + CHUNK_SIZE])

            total_readings += len(rows)
            print(f"  {g.name} ({gd['town_state']}): {len(rows)} readings")

        await session.commit()
        print(f"\nSeeded {len(gauge_objs)} gauges, {total_readings} readings ✓")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
