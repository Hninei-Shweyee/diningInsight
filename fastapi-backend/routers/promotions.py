import json
import os
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from firebase import verify_firebase_token
from models.customer import Customer
from models.order import Order, OrderItem
from models.promotion import PromotionCampaign, PromotionRecipient
from schemas.promotion import PromotionSendRequest

router = APIRouter(prefix="/promotions", tags=["Promotions"])


def _customers_for_audience(db: Session, restaurant_id: str, audience: str, customer_ids: list[int] | None = None, menu_item_name: str | None = None):
    query = db.query(Customer).filter(Customer.restaurant_id == restaurant_id)
    if audience == "selected":
        return query.filter(Customer.id.in_(customer_ids or [])).all()
    if audience == "order_item":
        if not menu_item_name:
            return []
        return query.join(Order, Order.customer_id == Customer.id).join(OrderItem, OrderItem.order_id == Order.id) \
            .filter(Order.restaurant_id == restaurant_id, OrderItem.item_name == menu_item_name).distinct().order_by(Customer.name).all()

    counts = db.query(Order.customer_id, func.count(Order.id).label("order_count"), func.max(Order.ordered_at).label("last_order")) \
        .filter(Order.restaurant_id == restaurant_id).group_by(Order.customer_id).subquery()
    query = query.outerjoin(counts, Customer.id == counts.c.customer_id)
    if audience == "repeat":
        query = query.filter(counts.c.order_count >= 2)
    elif audience == "new":
        query = query.filter(Customer.created_at >= datetime.now(timezone.utc) - timedelta(days=30))
    elif audience == "inactive":
        query = query.filter((counts.c.last_order < datetime.now(timezone.utc) - timedelta(days=30)) | (counts.c.last_order.is_(None)))
    return query.order_by(Customer.name).all()


def _send_messenger_message(messenger_id: str, message: str):
    """Send via Messenger when PAGE_ACCESS_TOKEN is configured."""
    token = os.getenv("PAGE_ACCESS_TOKEN")
    if not token:
        return False, "PAGE_ACCESS_TOKEN is not configured"
    payload = json.dumps({"recipient": {"id": messenger_id}, "message": {"text": message}}).encode("utf-8")
    request = Request(
        f"https://graph.facebook.com/v22.0/me/messages?access_token={token}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            if 200 <= response.status < 300:
                return True, None
            return False, f"Messenger returned HTTP {response.status}"
    except HTTPError as error:
        return False, error.read().decode("utf-8", errors="replace")[:500]
    except URLError as error:
        return False, str(error.reason)[:500]


@router.get("/audiences")
def list_audiences(menu_item_name: str | None = None, db: Session = Depends(get_db), user=Depends(verify_firebase_token)):
    rid = user["uid"]
    return {
        "all": len(_customers_for_audience(db, rid, "all")),
        "repeat": len(_customers_for_audience(db, rid, "repeat")),
        "new": len(_customers_for_audience(db, rid, "new")),
        "inactive": len(_customers_for_audience(db, rid, "inactive")),
        "order_item": len(_customers_for_audience(db, rid, "order_item", menu_item_name=menu_item_name)) if menu_item_name else 0,
        "customers": [{"id": c.id, "name": c.name, "phone": c.phone} for c in _customers_for_audience(db, rid, "all")],
    }


@router.post("/send")
def send_promotion(payload: PromotionSendRequest, db: Session = Depends(get_db), user=Depends(verify_firebase_token)):
    if payload.audience == "selected" and not payload.customer_ids:
        raise HTTPException(422, "Select at least one customer")
    if payload.audience == "order_item" and not payload.menu_item_name:
        raise HTTPException(422, "Select a menu item for this customer group")
    if payload.message_type in {"today_special", "discount", "new_menu"} and not payload.menu_item_name:
        raise HTTPException(422, "Select a menu item for this promotion")
    if payload.message_type == "discount" and not (payload.promotion_value or "").strip():
        raise HTTPException(422, "Enter a discount value")
    customers = _customers_for_audience(db, user["uid"], payload.audience, payload.customer_ids, payload.menu_item_name)
    if not customers:
        raise HTTPException(422, "This customer group has no recipients")

    campaign = PromotionCampaign(
        restaurant_id=user["uid"], audience=payload.audience, message_type=payload.message_type,
        menu_item_name=payload.menu_item_name, promotion_value=payload.promotion_value,
        message=payload.message.strip(), recipient_count=len(customers), sent_at=datetime.now(timezone.utc),
    )
    db.add(campaign)
    db.flush()
    sent_count = 0
    failed_count = 0
    skipped_count = 0
    for customer in customers:
        messenger_id = (customer.messenger_id or "").strip()
        if not messenger_id:
            recipient = PromotionRecipient(
                campaign_id=campaign.id, customer_id=customer.id, customer_name=customer.name,
                messenger_id="", delivery_status="skipped", delivery_error="Customer has no Messenger identifier",
            )
            db.add(recipient)
            skipped_count += 1
            continue
        sent, error = _send_messenger_message(messenger_id, campaign.message.replace("[Customer Name]", customer.name))
        recipient = PromotionRecipient(
            campaign_id=campaign.id, customer_id=customer.id, customer_name=customer.name,
            messenger_id=messenger_id, delivery_status="sent" if sent else "failed",
            delivery_error=error, delivered_at=datetime.now(timezone.utc) if sent else None,
        )
        db.add(recipient)
        sent_count += int(sent)
        failed_count += int(not sent)
    campaign.sent_count = sent_count
    campaign.failed_count = failed_count
    campaign.skipped_count = skipped_count
    campaign.status = "sent" if not failed_count and not skipped_count else ("partial" if sent_count else "failed")
    db.commit()
    return {"id": campaign.id, "status": campaign.status, "sent_count": sent_count, "failed_count": failed_count, "skipped_count": skipped_count, "recipient_count": len(customers)}


@router.get("")
def promotion_history(db: Session = Depends(get_db), user=Depends(verify_firebase_token)):
    campaigns = db.query(PromotionCampaign).filter(PromotionCampaign.restaurant_id == user["uid"]).order_by(PromotionCampaign.created_at.desc()).all()
    return [{
        "id": c.id, "audience": c.audience, "message_type": c.message_type, "menu_item_name": c.menu_item_name,
        "promotion_value": c.promotion_value, "message": c.message, "status": c.status,
        "recipient_count": c.recipient_count, "sent_count": c.sent_count, "failed_count": c.failed_count, "skipped_count": c.skipped_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "sent_at": c.sent_at.isoformat() if c.sent_at else None,
    } for c in campaigns]


@router.get("/{campaign_id}/recipients")
def promotion_recipients(campaign_id: int, db: Session = Depends(get_db), user=Depends(verify_firebase_token)):
    campaign = db.query(PromotionCampaign).filter_by(id=campaign_id, restaurant_id=user["uid"]).first()
    if not campaign:
        raise HTTPException(404, "Promotion not found")
    recipients = db.query(PromotionRecipient).filter_by(campaign_id=campaign.id).order_by(PromotionRecipient.customer_name).all()
    return [{
        "id": r.id, "customer_name": r.customer_name, "delivery_status": r.delivery_status,
        "delivery_error": r.delivery_error, "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
    } for r in recipients]
