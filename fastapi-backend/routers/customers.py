# routers/customers.py — Customer endpoints
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from firebase import verify_firebase_token
from models.customer import Customer
from models.order import Order, OrderItem
from schemas.customer import CustomerOut
from schemas.order import OrderOut
from datetime import datetime, date as date_type
from typing import Optional
from collections import Counter

router = APIRouter(prefix="/customers", tags=["Customers"])


def _preferred_menu(orders) -> Optional[str]:
    """Return the most ordered item_name across a list of orders."""
    counts = Counter()
    for order in orders:
        for item in order.items:
            counts[item.item_name] += item.quantity
    return counts.most_common(1)[0][0] if counts else None


def _filter_orders_by_date(orders, date_from: Optional[str], date_to: Optional[str]):
    """Filter a list of Order objects to those within [date_from, date_to]."""
    if not date_from and not date_to:
        return orders
    df = datetime.fromisoformat(date_from).date() if date_from else None
    dt = datetime.fromisoformat(date_to).date()   if date_to   else None
    result = []
    for o in orders:
        order_date = o.ordered_at.date() if hasattr(o.ordered_at, 'date') else o.ordered_at
        if df and order_date < df:
            continue
        if dt and order_date > dt:
            continue
        result.append(o)
    return result


@router.get("", response_model=list[CustomerOut])
def list_customers(
    sort_by:   Optional[str] = None,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: list customers belonging to the authenticated restaurant."""
    customers = db.query(Customer).filter_by(restaurant_id=user["uid"]).all()
    result = []
    for c in customers:
        orders = _filter_orders_by_date(c.orders, date_from, date_to)
        out = CustomerOut.model_validate(c)
        out.total_orders   = len(orders)
        out.preferred_menu = _preferred_menu(orders)
        result.append(out)

    if sort_by == "most_frequent":
        result.sort(key=lambda x: x.total_orders, reverse=True)
    elif sort_by == "least_frequent":
        result.sort(key=lambda x: x.total_orders)
    else:
        result.sort(key=lambda x: x.id, reverse=True)

    return result


@router.get("/{customer_id}", response_model=dict)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: full customer profile — only accessible by the owning restaurant."""
    customer = db.query(Customer).filter_by(id=customer_id, restaurant_id=user["uid"]).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    orders = db.query(Order).filter_by(customer_id=customer_id)\
                .order_by(Order.ordered_at.desc()).all()

    order_history = []
    for o in orders:
        order_history.append({
            "id":             o.id,
            "total_price":    float(o.total_price),
            "payment_method": o.payment_method,
            "status":         o.status,
            "ordered_at":     o.ordered_at.isoformat(),
            "items": [
                {
                    "item_name": i.item_name,
                    "quantity":  i.quantity,
                    "price":     float(i.price),
                    "subtotal":  float(i.subtotal),
                }
                for i in o.items
            ],
        })

    return {
        "id":             customer.id,
        "messenger_id":   customer.messenger_id,
        "name":           customer.name,
        "phone":          customer.phone,
        "address":        customer.address,
        "created_at":     customer.created_at.isoformat(),
        "total_orders":   len(orders),
        "preferred_menu": _preferred_menu(orders),
        "orders":         order_history,
    }
