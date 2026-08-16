from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from database import Base


class PromotionCampaign(Base):
    __tablename__ = "promotion_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(String(50), nullable=False, index=True)
    audience = Column(String(30), nullable=False)
    message_type = Column(String(30), nullable=False, default="discount")
    menu_item_name = Column(String(100), nullable=True)
    promotion_value = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="sent")
    recipient_count = Column(Integer, nullable=False, default=0)
    sent_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    skipped_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)


class PromotionRecipient(Base):
    __tablename__ = "promotion_recipients"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("promotion_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(100), nullable=False)
    messenger_id = Column(String(100), nullable=False)
    delivery_status = Column(String(20), nullable=False, default="queued")
    delivery_error = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
