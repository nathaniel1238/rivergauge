from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


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
