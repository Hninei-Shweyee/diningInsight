from pydantic import BaseModel
from typing import Optional

class MenuItemIn(BaseModel):
    name:         str
    category:     str
    price:        float
    image_url:    Optional[str] = None
    is_available: bool = True
    is_special:   bool = False

class MenuItemOut(BaseModel):
    id:           int
    name:         str
    category:     str
    price:        float
    image_url:    Optional[str]
    is_available: bool
    is_special:   bool
    model_config = {"from_attributes": True}
