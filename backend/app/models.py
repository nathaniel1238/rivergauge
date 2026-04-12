from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, SmallInteger, String, Float, DateTime,
    Text, ForeignKey, UniqueConstraint, Index,
)
from app.database import Base


class Gauge(Base):
    __tablename__ = "gauges"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(SmallInteger, unique=True, nullable=False)
    name = Column(String(255), nullable=False, default="Unknown Device")
    town_state = Column(String(255))
    last_updated_at = Column(DateTime(timezone=True))
    battery_state = Column(String(20))  # healthy | mid | replace
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    gauge_id = Column(Integer, ForeignKey("gauges.id"), nullable=False)
    ts = Column(DateTime(timezone=True), nullable=False)
    sequence_num = Column(Integer)
    pressure_pa = Column(Float)
    water_depth_cm = Column(Float)
    water_level_in = Column(Float)
    battery_mv = Column(Integer)
    battery_state = Column(String(20))
    status_flags = Column(SmallInteger)
    raw_payload_b64 = Column(Text)
    received_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("gauge_id", "sequence_num", name="uq_gauge_sequence"),
        Index("idx_gauge_ts", "gauge_id", "ts"),
    )
