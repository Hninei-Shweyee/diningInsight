# routers/orders.py — Order endpoints
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from firebase import verify_firebase_token
from models.customer import Customer
from models.order import Order, OrderItem
from schemas.order import OrderIn, OrderOut, StatusUpdate

router = APIRouter(prefix="/orders", tags=["Orders"])

VALID_STATUSES = {"pending", "cooking", "ready", "delivered"}

@router.post("", response_model=dict)
def create_order(body: OrderIn, db: Session = Depends(get_db)):
    """
    Called by the Node.js bot when a customer completes an order.
    Upserts the customer then saves the order + items.
    """
    rid = body.restaurant_id

    # Upsert customer — scope lookup by restaurant if restaurant_id provided
    query = db.query(Customer).filter_by(messenger_id=body.messenger_id)
    if rid:
        query = query.filter_by(restaurant_id=rid)
    customer = query.first()

    if not customer:
        customer = Customer(
            restaurant_id=rid,
            messenger_id=body.messenger_id,
            name=body.name,
            phone=body.phone,
            address=body.address,
        )
        db.add(customer)
        db.flush()
    else:
        customer.name    = body.name
        customer.phone   = body.phone
        customer.address = body.address

    # Create order
    order = Order(
        restaurant_id  = rid,
        customer_id    = customer.id,
        total_price    = body.total_price,
        payment_method = body.payment_method,
        status         = body.status,
        ordered_at     = datetime.fromisoformat(body.ordered_at.replace("Z", "+00:00")),
    )
    db.add(order)
    db.flush()

    for item in body.items:
        db.add(OrderItem(
            order_id  = order.id,
            item_name = item.name,
            quantity  = item.quantity,
            price     = item.price,
            subtotal  = item.subtotal,
        ))

    db.commit()
    return {"success": True, "order_id": order.id}


@router.get("", response_model=list[OrderOut])
def list_orders(
    status: str = None,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: list orders for the authenticated restaurant."""
    query = db.query(Order).join(Customer).filter(Order.restaurant_id == user["uid"])
    if status:
        query = query.filter(Order.status == status)
    orders = query.order_by(Order.ordered_at.desc()).all()

    result = []
    for o in orders:
        out = OrderOut.model_validate(o)
        out.customer_name    = o.customer.name
        out.customer_phone   = o.customer.phone
        out.customer_address = o.customer.address
        result.append(out)
    return result


@router.patch("/{order_id}/status", response_model=dict)
def update_order_status(
    order_id: int,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: staff updates order status (cooking → ready → delivered)."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {VALID_STATUSES}")
    order = db.query(Order).filter_by(id=order_id, restaurant_id=user["uid"]).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = body.status
    db.commit()
    return {"success": True, "order_id": order_id, "status": body.status}
