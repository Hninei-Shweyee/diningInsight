from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class CustomerOut(BaseModel):
    id:             int
    messenger_id:   str
    name:           str
    phone:          str
    address:        str
    created_at:     datetime
    total_orders:   int = 0
    preferred_menu: Optional[str] = None
    model_config = {"from_attributes": True}
