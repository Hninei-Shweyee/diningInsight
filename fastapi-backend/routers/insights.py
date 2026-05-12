# routers/insights.py — Analytics queries for the Insights dashboard page
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
from firebase import verify_firebase_token
from models.order import Order, OrderItem
from models.customer import Customer

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.get("/summary")
def get_insights(
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Returns analytics data for the authenticated restaurant's Insights page."""
    rid = user["uid"]

    # Most ordered menu items (all time) — for pie chart
    most_ordered = db.query(
        OrderItem.item_name,
        func.sum(OrderItem.quantity).label("total_qty")
    ).join(Order)\
     .filter(Order.restaurant_id == rid)\
     .group_by(OrderItem.item_name)\
     .order_by(desc("total_qty"))\
     .limit(10).all()

    # Total orders and revenue
    totals = db.query(
        func.count(Order.id).label("total_orders"),
        func.coalesce(func.sum(Order.total_price), 0).label("total_revenue")
    ).filter(Order.restaurant_id == rid).first()

    # Peak ordering hour (0-23)
    peak_hour_row = db.query(
        func.extract("hour", Order.ordered_at).label("hour"),
        func.count(Order.id).label("cnt")
    ).filter(Order.restaurant_id == rid)\
     .group_by("hour")\
     .order_by(desc("cnt"))\
     .first()

    # Repeat customers (ordered more than once)
    repeat_customers = db.query(func.count()).select_from(
        db.query(Order.customer_id)
          .filter(Order.restaurant_id == rid)
          .group_by(Order.customer_id)
          .having(func.count(Order.id) > 1)
          .subquery()
    ).scalar()

    # Last order date
    last_order = db.query(func.max(Order.ordered_at))\
                   .filter(Order.restaurant_id == rid).scalar()

    # Top items this month
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    top_this_month = db.query(
        OrderItem.item_name,
        func.sum(OrderItem.quantity).label("total_qty")
    ).join(Order)\
     .filter(
        Order.restaurant_id == rid,
        func.extract("month", Order.ordered_at) == now.month,
        func.extract("year",  Order.ordered_at) == now.year
     )\
     .group_by(OrderItem.item_name)\
     .order_by(desc("total_qty"))\
     .limit(5).all()

    # Format peak hour as readable string e.g. "12pm - 1pm"
    peak_hour = None
    if peak_hour_row:
        h = int(peak_hour_row.hour)
        def fmt(hr): return f"{hr}am" if hr < 12 else (f"12pm" if hr == 12 else f"{hr-12}pm")
        peak_hour = f"{fmt(h)} - {fmt(h+1)}"

    return {
        "most_ordered_items": [
            {"name": r.item_name, "quantity": int(r.total_qty)} for r in most_ordered
        ],
        "top_this_month": [
            {"name": r.item_name, "quantity": int(r.total_qty)} for r in top_this_month
        ],
        "total_orders":       int(totals.total_orders),
        "total_revenue":      float(totals.total_revenue),
        "peak_ordering_time": peak_hour,
        "last_order_date":    last_order.isoformat() if last_order else None,
        "repeat_customers":   int(repeat_customers or 0),
    }
