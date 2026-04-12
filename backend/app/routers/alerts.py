import re
import secrets
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import AlertSubscription
from app.schemas import AlertSubscribeRequest, AlertSubscribeResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_RE = re.compile(r"^\+[1-9]\d{7,14}$")


def _mask_contact(channel: str, contact: str) -> str:
    if channel == "email":
        local, _, domain = contact.partition("@")
        masked_local = local[0] + "***" if local else "***"
        return f"{masked_local}@{domain}"
    # phone: keep first 2 and last 4 digits
    return contact[:3] + "***" + contact[-4:]


@router.post("/subscribe", status_code=201, response_model=AlertSubscribeResponse)
async def subscribe(body: AlertSubscribeRequest, db: AsyncSession = Depends(get_db)):
    # Validate contact format based on channel
    if body.channel == "email":
        if not _EMAIL_RE.match(body.contact):
            raise HTTPException(status_code=422, detail="Invalid email address")
    else:
        if not _PHONE_RE.match(body.contact):
            raise HTTPException(
                status_code=422,
                detail="Phone must be in E.164 format, e.g. +12125551234",
            )

    # Duplicate check
    existing = await db.execute(
        select(AlertSubscription).where(
            AlertSubscription.gauge_id == body.gauge_id,
            AlertSubscription.condition == body.condition,
            AlertSubscription.threshold_in == body.threshold_in,
            AlertSubscription.channel == body.channel,
            AlertSubscription.contact == body.contact,
            AlertSubscription.active.is_(True),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Already subscribed with these settings")

    token = secrets.token_urlsafe(32)
    sub = AlertSubscription(
        gauge_id=body.gauge_id,
        condition=body.condition,
        threshold_in=body.threshold_in,
        channel=body.channel,
        contact=body.contact,
        token=token,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    logger.info("New %s subscription for gauge %d (%s)", body.channel, body.gauge_id, body.condition)

    return AlertSubscribeResponse(
        id=sub.id,
        token=sub.token,
        gauge_id=sub.gauge_id,
        condition=sub.condition,
        threshold_in=sub.threshold_in,
        channel=sub.channel,
        contact=_mask_contact(sub.channel, sub.contact),
    )


@router.delete("/unsubscribe/{token}", status_code=200)
async def unsubscribe(token: str, db: AsyncSession = Depends(get_db)):
    sub = await _get_active_sub(token, db)
    sub.active = False
    await db.commit()
    return {"status": "unsubscribed"}


@router.get("/unsubscribe/{token}", status_code=302)
async def unsubscribe_via_link(token: str, db: AsyncSession = Depends(get_db)):
    """Called when a user clicks the unsubscribe link in an email/SMS."""
    try:
        sub = await _get_active_sub(token, db)
        sub.active = False
        await db.commit()
    except HTTPException:
        pass  # token not found or already inactive — still redirect
    return RedirectResponse(url=f"{settings.app_base_url}/alerts/unsubscribed")


async def _get_active_sub(token: str, db: AsyncSession) -> AlertSubscription:
    result = await db.execute(
        select(AlertSubscription).where(AlertSubscription.token == token)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub
