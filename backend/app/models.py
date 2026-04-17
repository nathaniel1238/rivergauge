from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, Integer, SmallInteger, String, Float, DateTime,
    Text, ForeignKey, UniqueConstraint, Index,
)
from app.database import Base


class Gauge(Base):
    __tablename__ = "gauges"

    id = Column(Integer, primary_key=True, index=True)
    dev_eui   = Column(String(16), unique=True, nullable=True, index=True)
    device_id = Column(Integer, unique=True, nullable=True)
    name = Column(String(255), nullable=False, default="Unknown Device")
    town_state = Column(String(255))
    last_updated_at = Column(DateTime(timezone=True))
    battery_state = Column(String(20))  # healthy | mid | replace
    latitude  = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    featured  = Column(Boolean, default=False, nullable=False)
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


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id           = Column(Integer, primary_key=True, index=True)
    gauge_id     = Column(Integer, ForeignKey("gauges.id"), nullable=False)
    condition    = Column(String(10), nullable=False)    # "above" | "below"
    threshold_in = Column(Float, nullable=False)
    channel      = Column(String(5), nullable=False)     # "email" | "sms"
    contact      = Column(String(255), nullable=False)   # email or E.164 phone
    token        = Column(String(64), unique=True, nullable=False, index=True)
    active       = Column(Boolean, default=True, nullable=False)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (Index("idx_sub_gauge_active", "gauge_id", "active"),)


class AlertNotification(Base):
    __tablename__ = "alert_notifications"

    id              = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("alert_subscriptions.id"), nullable=False)
    reading_id      = Column(Integer, ForeignKey("readings.id"), nullable=False)
    sent_at         = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    water_level_in  = Column(Float, nullable=False)
    channel         = Column(String(5), nullable=False)
    success         = Column(Boolean, default=True, nullable=False)
    error_msg       = Column(Text, nullable=True)

    __table_args__ = (Index("idx_notif_sub_sent", "subscription_id", "sent_at"),)
