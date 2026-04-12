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

npm install
npm run dev
# → http://localhost:3000
```

---

## Running with Docker Compose (full stack)

```bash
docker compose up --build -d
docker compose exec backend python seed.py
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
| `BATTERY_MID_MV` | `3400` | mV threshold ≥ mid; below → replace (red) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server for email alerts |
| `SMTP_PORT` | `587` | SMTP port (STARTTLS) |
| `SMTP_USER` | _(empty)_ | SMTP login — Gmail address |
| `SMTP_PASSWORD` | _(empty)_ | Gmail App Password (16-char, see below) |
| `ALERT_FROM_NAME` | `River Gauge Alerts` | Display name on alert emails |
| `TWILIO_ACCOUNT_SID` | _(empty)_ | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | _(empty)_ | Twilio auth token |
| `TWILIO_FROM_NUMBER` | _(empty)_ | Twilio number in E.164 format (`+1xxxxxxxxxx`) |
| `APP_BASE_URL` | `http://localhost:3000` | Base URL used in unsubscribe links |
| `ALERT_COOLDOWN_HOURS` | `6` | Minimum hours between repeat alerts for the same subscription |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Backend base URL |
| `NEXT_PUBLIC_FEATURE_ALERTS` | `false` | Set to `true` to enable the Alerts UI and routes |

---

## Feature flags

| Flag | Where | Effect when `true` |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_ALERTS` | `frontend/.env.local` | Shows Alerts in the sidebar; enables `/alerts` routes |

Flags are baked into the Next.js build. After changing a flag in Docker, rebuild the frontend:

```bash
docker compose up --build -d frontend
```

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
| `POST` | `/api/alerts/subscribe` | Create an anonymous alert subscription |
| `DELETE` | `/api/alerts/unsubscribe/{token}` | Unsubscribe (programmatic) |
| `GET` | `/api/alerts/unsubscribe/{token}` | Unsubscribe via link click → redirects to `/alerts/unsubscribed` |

**Range options:** `24h` | `7d` | `30d` | `3m`

---

## ChirpStack integration

### HTTP Integration setup

1. In ChirpStack UI (`http://localhost:8080`) → **Applications** → select your app → **Integrations**
2. Add an **HTTP** integration
3. Set the uplink URL to:
   - Local dev: `http://host.docker.internal:8000/api/ingest/chirpstack`
   - Production: `http://<your-server-ip>:8000/api/ingest/chirpstack`
4. ChirpStack will POST every uplink to that URL automatically

The endpoint accepts the standard ChirpStack v4 uplink JSON envelope. The payload field is auto-detected (`data`, `frmPayload`, `Data`, `payload`, or `Payload`).

### Payload format (20 bytes, little-endian packed)

```c
typedef struct {
  uint32_t device_id;       // 4 B
  uint32_t sequence_num;    // 4 B
  float    pressure_pa;     // 4 B
  float    water_depth_cm;  // 4 B
  uint16_t battery_mv;      // 2 B
  uint16_t status_flags;    // 2 B
} __attribute__((packed)) river_gauge_packet_t;  // 20 bytes total
```

Python struct format: `<IIffHH`

Conversion: `water_level_in = water_depth_cm / 2.54`

Deduplication: readings with a duplicate `(gauge_id, sequence_num)` pair are silently discarded.

### Battery state thresholds (configurable via env)

| State | Threshold | UI colour |
|---|---|---|
| Healthy | ≥ 3700 mV | Green |
| Mid | 3400 – 3699 mV | Amber |
| Replace | < 3400 mV | Red |

---

## Alert subscriptions (anonymous)

No user accounts are required. Anyone can subscribe with just an email address or phone number.

### How it works

1. A visitor opens the **Alerts** page and creates a rule: pick a gauge, set above/below threshold in inches, enter email or phone.
2. The subscription is stored in the database.
3. Every time a new reading is ingested, the backend checks all active subscriptions for that gauge.
4. If the water level crosses the threshold and the cooldown period has passed, an email or SMS is sent.
5. Every notification includes a one-click unsubscribe link.

### Enabling the Alerts UI

The Alerts feature is hidden by default behind a feature flag. To enable it:

```bash
# frontend/.env.local
NEXT_PUBLIC_FEATURE_ALERTS=true
```

Restart (or rebuild) the frontend after changing this.

### Setting up email (Gmail SMTP)

1. Enable **2-Step Verification** on your Google account
2. Go to Google Account → Security → **App Passwords**
3. Generate a new App Password (select "Mail" and your device)
4. Copy the 16-character password into `backend/.env`:

```env
SMTP_USER=yourapp@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
```

Gmail free tier sends up to ~500 emails/day. For higher volume, swap in **SendGrid** or **AWS SES** by replacing the `send_email_alert` function in `backend/app/notifications.py`.

### Setting up SMS (Twilio)

1. Create a free account at [twilio.com](https://www.twilio.com) — free trial includes credit
2. From the Twilio Console, copy your **Account SID** and **Auth Token**
3. Buy or use a trial phone number
4. Add to `backend/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+12125550000
```

Phone numbers must be in E.164 format (e.g. `+12125551234`).

### Alert cooldown

To prevent flooding, a subscription will not fire more than once per `ALERT_COOLDOWN_HOURS` (default: 6 hours). Each notification attempt (success or failure) is logged in the `alert_notifications` table for auditing.

### Testing alerts end-to-end

```bash
# 1. Subscribe
curl -X POST http://localhost:8000/api/alerts/subscribe \
  -H "Content-Type: application/json" \
  -d '{"gauge_id":1,"condition":"above","threshold_in":8.0,"channel":"email","contact":"you@example.com"}'

# 2. Build a 20-byte test payload (water_depth_cm=25cm = 9.84in, which is above 8.0in)
python3 -c "import struct,base64; print(base64.b64encode(struct.pack('<IIffHH',1,9999,101325.0,25.0,3800,0)).decode())"

# 3. POST a reading that crosses the threshold (replace DATA with output from step 2)
curl -X POST http://localhost:8000/api/alerts/subscribe \
  -H "Content-Type: application/json" \
  -d '{"deviceInfo":{"deviceName":"Test"},"data":"<DATA>"}'

# 4. Check your inbox — email should arrive within a few seconds

# 5. Unsubscribe
curl -X DELETE http://localhost:8000/api/alerts/unsubscribe/<token>
```

---

## Database schema

```
gauges
  id, device_id (uint32, unique), name, town_state,
  last_updated_at, battery_state, created_at

readings
  id, gauge_id → gauges.id, ts (timestamptz),
  sequence_num, pressure_pa, water_depth_cm, water_level_in,
  battery_mv, battery_state, status_flags, raw_payload_b64,
  received_at
  UNIQUE (gauge_id, sequence_num)   ← deduplication
  INDEX  (gauge_id, ts DESC)        ← fast range queries

alert_subscriptions
  id, gauge_id → gauges.id,
  condition ("above" | "below"), threshold_in (float),
  channel ("email" | "sms"), contact (email or E.164 phone),
  token (unique, used for unsubscribe links),
  active (bool), created_at
  INDEX (gauge_id, active)

alert_notifications
  id, subscription_id → alert_subscriptions.id,
  reading_id → readings.id,
  sent_at, water_level_in, channel,
  success (bool), error_msg
  INDEX (subscription_id, sent_at)  ← cooldown lookups
```

---

## Frontend routes

| Path | Description |
|---|---|
| `/` | Redirects → `/dashboard` |
| `/dashboard` | Gauge grid with sparkline charts and search/pagination |
| `/dashboard/gauges/[id]` | Gauge detail — full interactive chart |
| `/alerts` | Alert subscription management _(feature-flagged)_ |
| `/alerts/unsubscribed` | Confirmation page shown after clicking an unsubscribe link |
| `/settings` | Display and data preferences |
