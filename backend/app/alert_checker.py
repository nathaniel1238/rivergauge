"""
check_and_fire_alerts — called via asyncio.create_task after a new Reading is committed.
Never raises; all errors are caught and logged so the ingest response is never affected.
Opens its own DB session so it never touches the already-closed request session.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import AlertNotification, AlertSubscription
from app.notifications import send_email_alert, send_sms_alert

logger = logging.getLogger(__name__)


async def check_and_fire_alerts(
    gauge_id: int,
    reading_id: int,
    water_level_in: float,
) -> None:
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AlertSubscription).where(
                    AlertSubscription.gauge_id == gauge_id,
                    AlertSubscription.active.is_(True),
                )
            )
            subscriptions = result.scalars().all()

            notifications_to_add: list[AlertNotification] = []

            for sub in subscriptions:
                # Evaluate threshold condition
                if sub.condition == "above" and water_level_in <= sub.threshold_in:
                    continue
                if sub.condition == "below" and water_level_in >= sub.threshold_in:
                    continue

                # Check cooldown — skip if a successful notification was sent recently
                cooldown_cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.alert_cooldown_hours)
                recent = await db.execute(
                    select(AlertNotification).where(
                        AlertNotification.subscription_id == sub.id,
                        AlertNotification.success.is_(True),
                        AlertNotification.sent_at >= cooldown_cutoff,
                    )
                )
                if recent.scalar_one_or_none() is not None:
                    logger.debug("Cooldown active for subscription %d — skipping", sub.id)
                    continue

                unsubscribe_url = (
                    f"{settings.app_base_url}/alerts/unsubscribe?token={sub.token}"
                )

                success = True
                error_msg = None
                try:
                    gauge_name = await _get_gauge_name(db, gauge_id)
                    if sub.channel == "email":
                        await send_email_alert(
                            to_address=sub.contact,
                            gauge_name=gauge_name,
                            condition=sub.condition,
                            threshold_in=sub.threshold_in,
                            current_in=water_level_in,
                            unsubscribe_url=unsubscribe_url,
                        )
                    else:
                        await send_sms_alert(
                            to_number=sub.contact,
                            gauge_name=gauge_name,
                            condition=sub.condition,
                            threshold_in=sub.threshold_in,
                            current_in=water_level_in,
                            unsubscribe_url=unsubscribe_url,
                        )
                except Exception as exc:
                    logger.error("Failed to send %s alert for sub %d: %s", sub.channel, sub.id, exc)
                    success = False
                    error_msg = str(exc)

                notifications_to_add.append(
                    AlertNotification(
                        subscription_id=sub.id,
                        reading_id=reading_id,
                        water_level_in=water_level_in,
                        channel=sub.channel,
                        success=success,
                        error_msg=error_msg,
                    )
                )

            if notifications_to_add:
                db.add_all(notifications_to_add)
                await db.commit()

    except Exception as exc:
        logger.error("check_and_fire_alerts failed for gauge %d: %s", gauge_id, exc)


async def _get_gauge_name(db: AsyncSession, gauge_id: int) -> str:
    from app.models import Gauge  # noqa: PLC0415
    result = await db.execute(select(Gauge).where(Gauge.id == gauge_id))
    gauge = result.scalar_one_or_none()
    return gauge.name if gauge else f"Gauge {gauge_id}"
