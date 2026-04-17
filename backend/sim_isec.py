"""
ISEC Demo Sensor simulator.

Sends fake readings to the /api/ingest/chirpstack endpoint, formatted exactly
like a real ChirpStack uplink, so the frontend charts update live.

Modes
─────
  Single reading:
      python sim_isec.py 8.5              # post 8.5 inches once

  Interactive (type a value, press Enter):
      python sim_isec.py

  Auto-loop (post every N seconds with slight drift):
      python sim_isec.py --loop 5 --start 6.0

Targets (pick one via --url):
  Local:      http://localhost:8000   (default when --url is omitted locally)
  Railway:    https://your-app.up.railway.app

Or set INGEST_URL env var:
      INGEST_URL=https://your-app.up.railway.app python sim_isec.py 8.5
"""
import argparse
import base64
import json
import random
import struct
import sys
import time
import urllib.request
from datetime import datetime, timezone

# ── Config ─────────────────────────────────────────────────────────────────────
DEVICE_ID   = 13          # must match seed_isec.py
BATTERY_MV  = 3850        # show healthy battery
STATUS_FLAGS = 0

DEFAULT_URL = "https://rivergauge-production.up.railway.app"

# ── Helpers ────────────────────────────────────────────────────────────────────

_seq = int(time.time()) & 0xFFFFFFFF  # start from current Unix time — unique across restarts


def build_payload(water_level_in: float, seq: int) -> str:
    """Pack a 20-byte struct and return base64 string."""
    water_depth_cm = water_level_in * 2.54
    pressure_pa    = 101325.0 + water_depth_cm * 98.0665
    raw = struct.pack(
        "<IIffHH",
        DEVICE_ID,
        seq,
        pressure_pa,
        water_depth_cm,
        BATTERY_MV,
        STATUS_FLAGS,
    )
    return base64.b64encode(raw).decode()


def chirpstack_body(water_level_in: float, seq: int) -> dict:
    """Build a minimal ChirpStack HTTP integration uplink body."""
    return {
        "deviceInfo": {
            "deviceName": "ISEC Demo Sensor",
            "devEui":     "0000000000000013",
        },
        "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z",
        "data": build_payload(water_level_in, seq),
    }


def post_reading(water_level_in: float, url: str) -> dict:
    global _seq
    body  = chirpstack_body(water_level_in, _seq)
    _seq += 1

    data    = json.dumps(body).encode()
    req     = urllib.request.Request(
        f"{url.rstrip('/')}/api/ingest/chirpstack",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def fmt_level(v: float) -> str:
    return f"{v:.2f} in  ({v * 2.54:.1f} cm)"


# ── CLI ────────────────────────────────────────────────────────────────────────

def main():
    import os
    default_url = os.environ.get("INGEST_URL", DEFAULT_URL)

    parser = argparse.ArgumentParser(description="ISEC sensor simulator")
    parser.add_argument("level", nargs="?", type=float,
                        help="Water level in inches (omit for interactive mode)")
    parser.add_argument("--url", default=default_url,
                        help=f"Ingest base URL (default: {default_url})")
    parser.add_argument("--loop", type=float, metavar="SECONDS",
                        help="Auto-loop: post every N seconds with slight random drift")
    parser.add_argument("--start", type=float, default=6.0,
                        help="Starting water level for --loop mode (default: 6.0)")
    args = parser.parse_args()

    print(f"Target: {args.url}")
    print(f"Device: ISEC Demo Sensor (id={DEVICE_ID})")
    print()

    # ── Single reading ──────────────────────────────────────────────────────
    if args.level is not None and args.loop is None:
        try:
            resp = post_reading(args.level, args.url)
            print(f"✓ Sent  {fmt_level(args.level)}  → seq={resp.get('sequence_num')}  {resp.get('battery_state')}")
        except Exception as e:
            print(f"✗ Error: {e}", file=sys.stderr)
            sys.exit(1)
        return

    # ── Auto-loop mode ──────────────────────────────────────────────────────
    if args.loop is not None:
        level = args.start
        print(f"Looping every {args.loop}s  (Ctrl-C to stop)  start={fmt_level(level)}")
        print()
        try:
            while True:
                try:
                    resp = post_reading(level, args.url)
                    ts   = datetime.now().strftime("%H:%M:%S")
                    print(f"[{ts}] ✓ {fmt_level(level)}  seq={resp.get('sequence_num')}")
                except Exception as e:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ {e}", file=sys.stderr)
                time.sleep(args.loop)
                # Small random drift ±0.05 in, clamped to [0.5, 30]
                level = max(0.5, min(30.0, level + random.uniform(-0.05, 0.05)))
        except KeyboardInterrupt:
            print("\nStopped.")
        return

    # ── Interactive mode ────────────────────────────────────────────────────
    print("Interactive mode — type a water level in inches, press Enter to send.")
    print("  Examples:  6.5   12   3.0   (blank = repeat last,  q = quit)")
    print()
    last_level = 6.0
    while True:
        try:
            raw = input(f"  level [{last_level:.2f} in] > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nDone.")
            break

        if raw.lower() in ("q", "quit", "exit"):
            break
        if raw == "":
            level = last_level
        else:
            try:
                level = float(raw)
            except ValueError:
                print(f"  ✗ Not a number: {raw!r}")
                continue

        try:
            resp = post_reading(level, args.url)
            print(f"  ✓ Sent  {fmt_level(level)}  → seq={resp.get('sequence_num')}  {resp.get('battery_state')}")
            last_level = level
        except Exception as e:
            print(f"  ✗ Error: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
