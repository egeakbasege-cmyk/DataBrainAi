"""
POST /api/credits/checkout  — create Stripe PaymentIntent
POST /api/credits/webhook   — Stripe webhook handler
"""

from __future__ import annotations

import json
import logging
import os
import time

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .deps import get_current_user, get_db

logger = logging.getLogger(__name__)
router = APIRouter()

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

BUNDLE_PRICES: dict[int, int] = {1: 300, 3: 900, 10: 2500}  # cents


class CheckoutRequest(BaseModel):
    bundle: int


# ── Checkout ──────────────────────────────────────────────────────────

@router.post("/credits/checkout")
async def create_checkout(
    body: CheckoutRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.bundle not in BUNDLE_PRICES:
        raise HTTPException(status_code=400, detail=f"bundle must be one of {list(BUNDLE_PRICES)}")

    row = await db.execute(
        text("SELECT stripe_customer_id, email FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    user = row.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    customer_id = user["stripe_customer_id"]
    if not customer_id:
        customer = stripe.Customer.create(
            email=user["email"],
            metadata={"user_id": user_id},
        )
        customer_id = customer.id
        await db.execute(
            text("UPDATE users SET stripe_customer_id = :cid WHERE id = :uid"),
            {"cid": customer_id, "uid": user_id},
        )
        await db.commit()

    intent = stripe.PaymentIntent.create(
        amount=BUNDLE_PRICES[body.bundle],
        currency="usd",
        customer=customer_id,
        metadata={"user_id": user_id, "bundle": str(body.bundle)},
        idempotency_key=f"checkout_{user_id}_{body.bundle}_{int(time.time() // 60)}",
    )

    return {
        "client_secret": intent.client_secret,
        "amount_usd": BUNDLE_PRICES[body.bundle] / 100,
        "publishable_key": os.environ.get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", ""),
    }


# ── Webhook ───────────────────────────────────────────────────────────

@router.post("/credits/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not sig_header:
        logger.error("Webhook missing stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event["id"]

    # Idempotency check
    existing = await db.execute(
        text("SELECT id FROM transactions WHERE stripe_payment_intent = :pi"),
        {"pi": event["data"]["object"].get("id", "")},
    )
    if existing.first():
        return {"status": "duplicate"}

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        uid = pi["metadata"].get("user_id")
        bundle = int(pi["metadata"].get("bundle", 0))

        if not uid or bundle not in BUNDLE_PRICES:
            logger.error("Webhook bad metadata", extra={"meta": pi["metadata"]})
            return {"status": "bad_metadata"}

        await db.execute(
            text("UPDATE users SET credits = credits + :b WHERE id = :uid"),
            {"b": bundle, "uid": uid},
        )
        await db.execute(
            text(
                """INSERT INTO transactions
                   (user_id, bundle, amount_usd, stripe_payment_intent, status)
                   VALUES (:uid, :b, :amt, :pi, 'succeeded')"""
            ),
            {
                "uid": uid,
                "b": bundle,
                "amt": pi["amount"] / 100,
                "pi": pi["id"],
            },
        )
        await db.commit()
        logger.info("Credits granted", extra={"user_id": uid, "bundle": bundle})

    elif event["type"] == "payment_intent.payment_failed":
        pi = event["data"]["object"]
        uid = pi["metadata"].get("user_id")
        bundle = int(pi["metadata"].get("bundle", 0))
        await db.execute(
            text(
                """INSERT INTO transactions
                   (user_id, bundle, amount_usd, stripe_payment_intent, status)
                   VALUES (:uid, :b, :amt, :pi, 'failed')
                   ON CONFLICT DO NOTHING"""
            ),
            {
                "uid": uid or "",
                "b": bundle,
                "amt": pi["amount"] / 100,
                "pi": pi["id"],
            },
        )
        await db.commit()

    return {"status": "ok"}
