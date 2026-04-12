# River Gauge — Monitoring Dashboard

Real-time river water-level monitoring built on LoRaWAN / ChirpStack.

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), asyncpg |
| Database | PostgreSQL 16 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, ECharts |
| IoT | ChirpStack v4, LoRaWAN |

---

## Prerequisites

- **Docker Desktop** — for running Postgres (and optional full-stack Docker mode)
- **Python 3.12+** — for the backend
- **Node.js 18+** and **npm** — for the frontend

---

## Running end-to-end (local dev)

This is the recommended way to run the full stack locally for development.

### Step 1 — Start Postgres

```bash
docker run -d --name river-pg \
  -e POSTGRES_USER=river \
  -e POSTGRES_PASSWORD=river \
  -e POSTGRES_DB=river_gauge \
  -p 5432:5432 \
  postgres:16-alpine
```

Verify it's running:

```bash
docker ps | grep river-pg
```

---

### Step 2 — Start the backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # macOS/Linux
# .venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Seed the database with 6 gauges + 90 days of demo readings
python seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Docs (Swagger UI): `http://localhost:8000/docs`

---

### Step 3 — Start the frontend

Open a new terminal tab:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
# → http://localhost:3000
```

If port 3000 is already in use, specify a different port:

```bash
npm run dev -- --port 3002
```

---

### Step 4 — Open the dashboard

Navigate to `http://localhost:3000` (or whichever port you used).
You should see 6 pre-seeded river gauges with 90 days of demo data.

---

## Running with Docker Compose (full stack)

Alternatively, run everything in containers:

```bash
# Build and start all services
docker compose up --build -d

# Seed the database
docker compose exec backend python seed.py

# Open the dashboard
open http://localhost:3000
```

To stop:

```bash
docker compose down
```

---

## Environment variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://river:river@localhost:5432/river_gauge` | Postgres connection string |
| `BATTERY_HEALTHY_MV` | `3700` | mV threshold ≥ healthy (green) |
| `BATTERY_MID_MV` | `3400` | mV threshold ≥ mid / below → replace (red) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Backend base URL (proxied by Next.js rewrites) |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/dashboard?range=24h` | Dashboard summary with sparklines |
| `GET` | `/api/gauges` | List all gauges |
| `GET` | `/api/gauges/{id}` | Single gauge metadata |
| `GET` | `/api/gauges/{id}/readings?range=24h&limit=1000` | Time-series readings |
| `POST` | `/api/ingest/chirpstack` | ChirpStack HTTP integration webhook |

**Range options:** `24h` | `7d` | `30d` | `90d`

---

## ChirpStack integration

### HTTP Integration setup

1. In ChirpStack → **Applications** → select your app → **Integrations**
2. Add an **HTTP** integration pointing to: `http://<your-server>:8000/api/ingest/chirpstack`
3. The endpoint accepts ChirpStack v3/v4 uplink JSON — the payload field is auto-detected (`data`, `frmPayload`, etc.)

### Payload format (18 bytes, little-endian packed)

```c
typedef struct {
  uint8_t  device_id;        // 1 B
  uint16_t sequence_num;     // 2 B
  uint32_t timestamp;        // 4 B  (Unix epoch, UTC)
  float    pressure_pa;      // 4 B
  float    water_depth_cm;   // 4 B
  uint16_t battery_mv;       // 2 B
  uint8_t  status_flags;     // 1 B
} __attribute__((packed)) river_gauge_packet_t;  // 18 bytes total
```

Python struct format: `<BHIffHB`

Conversion: `water_level_in = water_depth_cm / 2.54`

Deduplication: readings with a duplicate `(gauge_id, sequence_num)` pair are silently discarded.

### Battery state thresholds (configurable via env)

| State | Threshold | UI colour |
|---|---|---|
| Healthy | ≥ 3700 mV | Green |
| Mid | 3400 – 3699 mV | Amber |
| Replace | < 3400 mV | Red |

---

## Database schema

```
gauges
  id, device_id (uint8, unique), name, town_state,
  last_updated_at, battery_state, created_at

readings
  id, gauge_id → gauges.id, ts (timestamptz),
  sequence_num, pressure_pa, water_depth_cm, water_level_in,
  battery_mv, battery_state, status_flags, raw_payload_b64,
  received_at
  UNIQUE (gauge_id, sequence_num)   ← deduplication
  INDEX  (gauge_id, ts DESC)        ← fast range queries
```

---

## Frontend routes

| Path | Description |
|---|---|
| `/` | Redirects → `/dashboard` |
| `/dashboard` | Gauge grid with sparkline charts and search/pagination |
| `/dashboard/gauges/[id]` | Gauge detail — full interactive chart, click-to-pin readings |
| `/alerts` | Alert rule management |
| `/settings` | Display and data preferences |
