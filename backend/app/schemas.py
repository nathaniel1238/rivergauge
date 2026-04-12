from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class ReadingPoint(BaseModel):
    ts: str
    y: float  # water_level_in


class GaugeSummary(BaseModel):
    id: int
    device_id: int
    name: str
    town_state: Optional[str]
    last_updated_at: Optional[str]
    minutes_ago: Optional[int]
    battery_state: str        # healthy | mid | replace | unknown
    online_state: str         # online | offline
    sparkline: list[ReadingPoint]


class GaugeDetail(BaseModel):
    id: int
    device_id: int
    name: str
    town_state: Optional[str]
    last_updated_at: Optional[str]
    battery_state: str
    online_state: str


class ReadingOut(BaseModel):
    ts: str
    water_level_in: float
    water_depth_cm: Optional[float]
    battery_mv: Optional[int]
    battery_state: Optional[str]
    pressure_pa: Optional[float]


class AlertSubscribeRequest(BaseModel):
    gauge_id:     int
    condition:    str    # "above" | "below"
    threshold_in: float  # inches, 0–500
    channel:      str    # "email" | "sms"
    contact:      str    # email address or E.164 phone

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        if v not in ("above", "below"):
            raise ValueError("condition must be 'above' or 'below'")
        return v

    @field_validator("channel")
    @classmethod
    def validate_channel(cls, v: str) -> str:
        if v not in ("email", "sms"):
            raise ValueError("channel must be 'email' or 'sms'")
        return v

    @field_validator("threshold_in")
    @classmethod
    def validate_threshold(cls, v: float) -> float:
        if v < 0 or v > 500:
            raise ValueError("threshold_in must be between 0 and 500")
        return round(v, 2)

    @field_validator("contact")
    @classmethod
    def strip_contact(cls, v: str) -> str:
        return v.strip()


class AlertSubscribeResponse(BaseModel):
    id:           int
    token:        str
    gauge_id:     int
    condition:    str
    threshold_in: float
    channel:      str
    contact:      str    # masked
