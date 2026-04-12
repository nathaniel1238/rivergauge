"""
Decode the 20-byte packed river-gauge application payload.

C struct (little-endian, packed):
  uint32_t device_id       4 B
  uint32_t sequence_num    4 B
  float    pressure_pa     4 B
  float    water_depth_cm  4 B
  uint16_t battery_mv      2 B
  uint16_t status_flags    2 B
  ─────────────────────── 20 B
"""
import base64
import struct
from typing import Optional

STRUCT_FORMAT = "<IIffHH"
STRUCT_SIZE = struct.calcsize(STRUCT_FORMAT)  # must be 20

assert STRUCT_SIZE == 20, f"Unexpected struct size: {STRUCT_SIZE}"

# Fields known to carry the base64 payload in ChirpStack uplink JSON.
# Listed in priority order; first match wins.
_PAYLOAD_KEYS = ("data", "frmPayload", "Data", "payload", "Payload")


def extract_b64_payload(body: dict) -> Optional[str]:
    """Return the first non-empty base64 payload string found in a ChirpStack uplink body."""
    for key in _PAYLOAD_KEYS:
        val = body.get(key)
        if isinstance(val, str) and val:
            return val
    return None


def decode_bytes(raw: bytes) -> dict:
    """Parse exactly 20 bytes into a structured dict. Raises ValueError on bad length."""
    if len(raw) != STRUCT_SIZE:
        raise ValueError(
            f"Invalid payload length: expected {STRUCT_SIZE} bytes, got {len(raw)}"
        )
    device_id, sequence_num, pressure_pa, water_depth_cm, battery_mv, status_flags = (
        struct.unpack(STRUCT_FORMAT, raw)
    )
    return {
        "device_id": int(device_id),
        "sequence_num": int(sequence_num),
        "pressure_pa": float(pressure_pa),
        "water_depth_cm": float(water_depth_cm),
        "water_level_in": float(water_depth_cm) / 2.54,
        "battery_mv": int(battery_mv),
        "status_flags": int(status_flags),
    }


def decode_chirpstack_body(body: dict) -> tuple[dict, str]:
    """
    High-level helper: extract + decode the payload from a ChirpStack uplink JSON.
    Returns (decoded_fields, raw_b64_string).
    Raises ValueError if no payload found or length is wrong.
    """
    b64 = extract_b64_payload(body)
    if b64 is None:
        raise ValueError("No payload field found in ChirpStack uplink JSON")
    raw = base64.b64decode(b64)
    return decode_bytes(raw), b64
