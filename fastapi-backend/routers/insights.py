from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
from firebase import verify_firebase_token
from models.order import Order, OrderItem
from models.customer import Customer

router = APIRouter(prefix="/insights", tags=["Insights"])

TIME_BUCKETS = [
    (10, 12, "10:00-12:00"),
    (12, 14, "12:00-14:00"),
    (14, 17, "14:00-17:00"),
    (17, 20, "17:00-20:00"),
]


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    return date.fromisoformat(value)


def _date_bounds(period: str, date_from: Optional[str], date_to: Optional[str]):
    today = datetime.now(timezone.utc).date()
    start_date = _parse_date(date_from)
    end_date = _parse_date(date_to)

    if period == "today":
        start_date = end_date = today
    elif period == "week":
        start_date = today - timedelta(days=today.weekday())
        end_date = today
    elif period == "month":
        start_date = today.replace(day=1)
        end_date = today
    elif period == "last_month":
        first_day_this_month = today.replace(day=1)
        end_date = first_day_this_month - timedelta(days=1)
        start_date = end_date.replace(day=1)

    start_dt = datetime.combine(start_date, time.min) if start_date else None
    end_dt = datetime.combine(end_date + timedelta(days=1), time.min) if end_date else None
    return start_dt, end_dt


def _apply_order_date_filters(query, start_dt, end_dt):
    if start_dt:
        query = query.filter(Order.ordered_at >= start_dt)
    if end_dt:
        query = query.filter(Order.ordered_at < end_dt)
    return query


def _fmt_hour(hr: int) -> str:
    hr = hr % 24
    if hr == 0:
        return "12am"
    if hr < 12:
        return f"{hr}am"
    if hr == 12:
        return "12pm"
    return f"{hr - 12}pm"


def _popularity_level(quantity: int, max_quantity: int) -> str:
    if max_quantity <= 0:
        return "Low Popularity"
    ratio = quantity / max_quantity
    if ratio >= 0.75:
        return "Highly Popular"
    if ratio >= 0.50:
        return "Popular"
    if ratio >= 0.25:
        return "Moderate"
    return "Low Popularity"


@router.get("/summary")
def get_insights(
    period: str = "all",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Returns analytics data for the authenticated restaurant's Insights page."""
    rid = user["uid"]
    start_dt, end_dt = _date_bounds(period, date_from, date_to)

    menu_query = db.query(
        OrderItem.item_name.label("name"),
        func.sum(OrderItem.quantity).label("total_qty"),
        func.count(func.distinct(OrderItem.order_id)).label("order_count"),
        func.coalesce(func.sum(OrderItem.subtotal), 0).label("revenue"),
    ).join(Order)\
     .filter(Order.restaurant_id == rid)

    menu_query = _apply_order_date_filters(menu_query, start_dt, end_dt)
    menu_rows = menu_query.group_by(OrderItem.item_name)\
                          .order_by(desc("total_qty"))\
                          .all()

    most_ordered = menu_rows[:10]
    least_ordered = sorted(menu_rows, key=lambda row: (row.total_qty or 0, row.name or ""))[:10]

    totals = db.query(
        func.count(Order.id).label("total_orders"),
        func.coalesce(func.sum(Order.total_price), 0).label("total_revenue")
    ).filter(Order.restaurant_id == rid)
    totals = _apply_order_date_filters(totals, start_dt, end_dt).first()

    if start_dt or end_dt:
        customer_count_query = db.query(func.count(func.distinct(Order.customer_id)))\
                                 .filter(Order.restaurant_id == rid)
        customer_count_query = _apply_order_date_filters(customer_count_query, start_dt, end_dt)
        total_customers = customer_count_query.scalar()
    else:
        total_customers = db.query(func.count(Customer.id))\
                            .filter(Customer.restaurant_id == rid)\
                            .scalar()

    peak_hour_row = db.query(
        func.extract("hour", Order.ordered_at).label("hour"),
        func.count(Order.id).label("cnt")
    ).filter(Order.restaurant_id == rid)
    peak_hour_row = _apply_order_date_filters(peak_hour_row, start_dt, end_dt)\
        .group_by("hour")\
        .order_by(desc("cnt"))\
        .first()

    hourly_rows = db.query(
        func.extract("hour", Order.ordered_at).label("hour"),
        func.count(Order.id).label("cnt")
    ).filter(Order.restaurant_id == rid)
    hourly_rows = _apply_order_date_filters(hourly_rows, start_dt, end_dt)\
        .group_by("hour")\
        .all()

    repeat_customers = db.query(func.count()).select_from(
        db.query(Order.customer_id)
          .filter(Order.restaurant_id == rid)
          .filter(Order.ordered_at >= start_dt if start_dt else True)
          .filter(Order.ordered_at < end_dt if end_dt else True)
          .group_by(Order.customer_id)
          .having(func.count(Order.id) > 1)
          .subquery()
    ).scalar()

    last_order = db.query(func.max(Order.ordered_at))\
                   .filter(Order.restaurant_id == rid)
    last_order = _apply_order_date_filters(last_order, start_dt, end_dt).scalar()

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

    peak_hour = None
    if peak_hour_row:
        h = int(peak_hour_row.hour)
        peak_hour = f"{_fmt_hour(h)} - {_fmt_hour(h+1)}"

    hourly_counts = {int(row.hour): int(row.cnt) for row in hourly_rows}
    peak_periods = []
    for start_hour, end_hour, label in TIME_BUCKETS:
        count = sum(hourly_counts.get(hour, 0) for hour in range(start_hour, end_hour))
        peak_periods.append({"period": label, "orders": count})

    max_quantity = int(menu_rows[0].total_qty) if menu_rows else 0
    menu_popularity = [
        {
            "rank": index + 1,
            "name": row.name,
            "quantity": int(row.total_qty or 0),
            "order_count": int(row.order_count or 0),
            "revenue": float(row.revenue or 0),
            "popularity_level": _popularity_level(int(row.total_qty or 0), max_quantity),
        }
        for index, row in enumerate(menu_rows)
    ]

    order_item_rows = db.query(OrderItem.order_id, OrderItem.item_name)\
                        .join(Order)\
                        .filter(Order.restaurant_id == rid)
    order_item_rows = _apply_order_date_filters(order_item_rows, start_dt, end_dt).all()

    items_by_order = defaultdict(set)
    for order_id, item_name in order_item_rows:
        items_by_order[order_id].add(item_name)

    pair_counts = Counter()
    for item_names in items_by_order.values():
        names = sorted(item_names)
        for i, first in enumerate(names):
            for second in names[i + 1:]:
                pair_counts[(first, second)] += 1

    promotion_suggestions = []
    low_item = next((item for item in reversed(menu_popularity) if item["quantity"] > 0), None)
    if low_item:
        promotion_suggestions.append(
            f"{low_item['name']} has low sales. Consider offering a 10% discount."
        )

    if pair_counts:
        first, second = pair_counts.most_common(1)[0][0]
        promotion_suggestions.append(
            f"{first} is frequently ordered with {second}. Consider creating a combo."
        )

    if peak_periods:
        low_period = min(peak_periods, key=lambda period: period["orders"])
        promotion_suggestions.append(
            f"Orders are low between {low_period['period']}. Consider a time-based promotion."
        )

    if menu_popularity:
        top_item = menu_popularity[0]
        promotion_suggestions.append(
            f"{top_item['name']} is the current top seller. Consider promoting it again."
        )

    repeat_purchase_rate = (
        (int(repeat_customers or 0) / int(total_customers or 0)) * 100
        if total_customers else 0
    )

    return {
        "most_ordered_items": [
            {"name": r.name, "quantity": int(r.total_qty or 0)} for r in most_ordered
        ],
        "least_ordered_items": [
            {"name": r.name, "quantity": int(r.total_qty or 0)} for r in least_ordered
        ],
        "top_this_month": [
            {"name": r.item_name, "quantity": int(r.total_qty)} for r in top_this_month
        ],
        "total_orders":       int(totals.total_orders),
        "total_revenue":      float(totals.total_revenue),
        "total_customers":     int(total_customers or 0),
        "peak_ordering_time": peak_hour,
        "peak_ordering_periods": peak_periods,
        "last_order_date":    last_order.isoformat() if last_order else None,
        "repeat_customers":   int(repeat_customers or 0),
        "repeat_purchase_rate": round(repeat_purchase_rate, 2),
        "most_popular_menu_item": menu_popularity[0] if menu_popularity else None,
        "menu_popularity": menu_popularity,
        "promotion_suggestions": promotion_suggestions,
    }
