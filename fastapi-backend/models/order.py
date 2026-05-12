from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

class Order(Base):
    __tablename__ = "orders"

    id             = Column(Integer, primary_key=True, index=True)
    restaurant_id  = Column(String(50), nullable=True, index=True)
    customer_id    = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    total_price    = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(30), nullable=False)
    status         = Column(String(20), nullable=False, default="pending")
    ordered_at     = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="orders")
    items    = relationship("OrderItem", back_populates="order", cascade="all, delete")

class OrderItem(Base):
    __tablename__ = "order_items"

    id       = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(100), nullable=False)
    quantity  = Column(Integer, nullable=False)
    price     = Column(Numeric(10, 2), nullable=False)
    subtotal  = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
