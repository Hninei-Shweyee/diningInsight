from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class OrderItemIn(BaseModel):
    name: str
    quantity: int
    price: float
    subtotal: float

class OrderIn(BaseModel):
    """Shape of the request body sent by the Node.js bot."""
    restaurant_id:  Optional[str] = None
    messenger_id:   str
    name:           str
    phone:          str
    address:        str
    items:          List[OrderItemIn]
    total_price:    float
    payment_method: str
    status:         str = "pending"
    ordered_at:     str  # ISO string from bot

class OrderItemOut(BaseModel):
    id:        int
    item_name: str
    quantity:  int
    price:     float
    subtotal:  float
    model_config = {"from_attributes": True}

class OrderOut(BaseModel):
    id:             int
    customer_id:    int
    total_price:    float
    payment_method: str
    status:         str
    ordered_at:     datetime
    items:          List[OrderItemOut] = []
    # Customer fields joined for dashboard display
    customer_name:  str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    model_config = {"from_attributes": True}

class StatusUpdate(BaseModel):
    status: str  # pending | cooking | ready | delivered
