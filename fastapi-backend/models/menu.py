from sqlalchemy import Column, Integer, String, Numeric, Boolean, Text, DateTime, func
from database import Base

class MenuItem(Base):
    __tablename__ = "menu_items"

    id            = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(String(50), nullable=True, index=True)
    name          = Column(String(100), nullable=False)
    category     = Column(String(50),  nullable=False)
    price        = Column(Numeric(10, 2), nullable=False)
    image_url    = Column(Text,    nullable=True)
    is_available = Column(Boolean, nullable=False, default=True)
    is_special   = Column(Boolean, nullable=False, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
