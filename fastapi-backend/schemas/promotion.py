from pydantic import BaseModel, Field
from typing import Literal


class PromotionSendRequest(BaseModel):
    audience: Literal["all", "repeat", "new", "inactive", "order_item", "selected"]
    customer_ids: list[int] = []
    menu_item_name: str | None = Field(default=None, max_length=100)
    message_type: Literal["today_special", "discount", "new_menu"]
    promotion_value: str | None = Field(default=None, max_length=100)
    message: str = Field(min_length=1, max_length=2000)
