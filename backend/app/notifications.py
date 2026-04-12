"""
Async notification senders for email (aiosmtplib) and SMS (Twilio).
Both functions raise on failure — the caller (alert_checker) handles exceptions.
"""
import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email_alert(
    to_address: str,
    gauge_name: str,
    condition: str,
    threshold_in: float,
    current_in: float,
    unsubscribe_url: str,
) -> None:
    subject = f"River Alert: {gauge_name} is {condition} {threshold_in:.2f} in"

    plain = (
        f"River Gauge Alert\n\n"
        f"{gauge_name} water level is currently {current_in:.2f} in, "
        f"which is {condition} your threshold of {threshold_in:.2f} in.\n\n"
        f"To unsubscribe from this alert, visit:\n{unsubscribe_url}\n"
    )

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">River Gauge Alert</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#444">
        <strong>{gauge_name}</strong> water level is currently
        <strong>{current_in:.2f} in</strong>,
        which is <strong>{condition}</strong> your threshold of
        <strong>{threshold_in:.2f} in</strong>.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
      <p style="font-size:11px;color:#999">
        <a href="{unsubscribe_url}" style="color:#999">Unsubscribe</a> from this alert.
      </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.alert_from_name} <{settings.smtp_user}>"
    msg["To"]      = to_address
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=True,
    )
    logger.info("Email alert sent to %s for %s", to_address, gauge_name)


async def send_sms_alert(
    to_number: str,
    gauge_name: str,
    condition: str,
    threshold_in: float,
    current_in: float,
    unsubscribe_url: str,
) -> None:
    body = (
        f"{gauge_name}: water level {current_in:.2f} in is {condition} "
        f"your {threshold_in:.2f} in threshold. "
        f"Unsubscribe: {unsubscribe_url}"
    )

    def _send_sync() -> None:
        from twilio.rest import Client  # noqa: PLC0415
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=to_number,
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_sync)
    logger.info("SMS alert sent to %s for %s", to_number, gauge_name)
