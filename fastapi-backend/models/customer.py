from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from database import Base

class Customer(Base):
    __tablename__ = "customers"

    id            = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(String(50), nullable=True, index=True)
    messenger_id  = Column(String(50), nullable=False)
    name          = Column(String(100), nullable=False)
    phone         = Column(String(20),  nullable=False)
    address       = Column(Text,        nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    orders = relationship("Order", back_populates="customer")
