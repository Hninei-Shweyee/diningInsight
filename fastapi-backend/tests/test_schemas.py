import pytest
from pydantic import BaseModel, ValidationError
from typing import List, Optional
from datetime import datetime

# schemas under test (from fastapi-backend/schemas/order.py)

class OrderItemIn(BaseModel):
    name: str
    quantity: int
    price: float
    subtotal: float


class OrderIn(BaseModel):
    restaurant_id: Optional[str] = None
    messenger_id: str
    name: str
    phone: str
    address: str
    items: List[OrderItemIn]
    total_price: float
    payment_method: str
    status: str = "pending"
    ordered_at: str  # ISO string from bot


class OrderItemOut(BaseModel):
    id: int
    item_name: str
    quantity: int
    price: float
    subtotal: float
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    customer_id: int
    total_price: float
    payment_method: str
    status: str
    ordered_at: datetime
    items: List[OrderItemOut] = []
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: str  # pending | cooking | ready | delivered

# — OrderItemIn


class TestOrderItemIn:
    """TC-01 to TC-03 — OrderItemIn schema validation."""

    def test_valid_order_item_in_creates_successfully(self):
        """TC-01: all four fields with correct types should pass."""
        item = OrderItemIn(
            name="Cheese Burger",
            quantity=2,
            price=150.0,
            subtotal=300.0,
        )

        assert item.name == "Cheese Burger"
        assert item.quantity == 2
        assert item.price == 150.0
        assert item.subtotal == 300.0

    def test_missing_required_field_raises_validation_error(self):
        """TC-02: missing quantity should raise ValidationError."""
        with pytest.raises(ValidationError):
            OrderItemIn(name="Burger")  # no quantity, price, subtotal

    def test_wrong_type_for_quantity_raises_validation_error(self):
        """TC-03: string quantity should raise ValidationError."""
        with pytest.raises(ValidationError):
            OrderItemIn(
                name="Burger",
                quantity="two",       # str instead of int
                price=100,
                subtotal=200,
            )

# — OrderIn 

class TestOrderIn:
    """TC-04 to TC-07 — OrderIn schema validation and defaults."""

    def test_full_order_in_populates_all_fields_and_defaults(self):
        """TC-04: full payload → all fields set, status defaults to pending."""
        item = OrderItemIn(name="Burger", quantity=2, price=150.0, subtotal=300.0)

        order = OrderIn(
            messenger_id="fb-123",
            name="Hnin",
            phone="091234567",
            address="Bangkok",
            items=[item],
            total_price=300.0,
            payment_method="Cash",
            ordered_at="2026-06-17T10:00:00Z",
        )

        assert order.messenger_id == "fb-123"
        assert order.name == "Hnin"
        assert order.phone == "091234567"
        assert order.address == "Bangkok"
        assert len(order.items) == 1
        assert order.items[0].name == "Burger"
        assert order.total_price == 300.0
        assert order.payment_method == "Cash"
        assert order.ordered_at == "2026-06-17T10:00:00Z"
        # defaults
        assert order.status == "pending"
        assert order.restaurant_id is None

    def test_order_in_with_explicit_status_and_restaurant_id(self):
        """TC-05: explicit status and restaurant_id are stored."""
        item = OrderItemIn(name="Fries", quantity=1, price=80.0, subtotal=80.0)

        order = OrderIn(
            restaurant_id="ttVU1DGA30aslTvyaf3g1Z6pwNh1",
            messenger_id="fb-456",
            name="John",
            phone="081234567",
            address="Chiang Mai",
            items=[item],
            total_price=80.0,
            payment_method="Bank Transfer",
            status="delivered",
            ordered_at="2026-06-16T14:00:00Z",
        )

        assert order.status == "delivered"
        assert order.restaurant_id == "ttVU1DGA30aslTvyaf3g1Z6pwNh1"

    def test_missing_messenger_id_raises_validation_error(self):
        """TC-06: messenger_id is required."""
        item = OrderItemIn(name="Burger", quantity=1, price=100.0, subtotal=100.0)

        with pytest.raises(ValidationError):
            OrderIn(
                # messenger_id is missing
                name="Hnin",
                phone="091",
                address="BKK",
                items=[item],
                total_price=100.0,
                payment_method="Cash",
                ordered_at="2026-06-17T10:00:00Z",
            )

    def test_empty_items_list_is_valid(self):
        """TC-07: items=[] is allowed (no minimum length check)."""
        order = OrderIn(
            messenger_id="fb-789",
            name="May",
            phone="095554444",
            address="Yangon",
            items=[],
            total_price=0.0,
            payment_method="Card",
            ordered_at="2026-06-17T08:00:00Z",
        )

        assert order.items == []
        assert order.total_price == 0.0


# OrderItemOut & OrderOut

class TestOrderItemOutAndOrderOut:
    """TC-08 to TC-09 — response schemas with from_attributes."""

    def test_order_item_out_from_attributes(self):
        """TC-08: model_validate from a DB-style object with attributes."""
        # simulate a SQLAlchemy order_item row
        class FakeDbOrderItem:
            def __init__(self):
                self.id = 1
                self.item_name = "Burger"
                self.quantity = 2
                self.price = 150.0
                self.subtotal = 300.0

        db_item = FakeDbOrderItem()
        out = OrderItemOut.model_validate(db_item)

        assert out.id == 1
        assert out.item_name == "Burger"
        assert out.quantity == 2
        assert out.price == 150.0
        assert out.subtotal == 300.0

    def test_order_out_with_nested_items_and_customer_fields(self):
        """TC-09: OrderOut holds list of OrderItemOut + optional customer info."""
        item = OrderItemOut(
            id=10,
            item_name="Burger",
            quantity=2,
            price=150.0,
            subtotal=300.0,
        )

        order = OrderOut(
            id=1,
            customer_id=5,
            total_price=300.0,
            payment_method="Cash",
            status="pending",
            ordered_at=datetime(2026, 6, 17, 10, 0, 0),
            items=[item],
            customer_name="Hnin",
            customer_phone="091",
            customer_address="BKK",
        )

        assert order.id == 1
        assert order.customer_id == 5
        assert len(order.items) == 1
        assert order.items[0].item_name == "Burger"
        assert order.items[0].quantity == 2
        assert order.customer_name == "Hnin"
        assert order.customer_phone == "091"
        assert order.customer_address == "BKK"

    def test_order_out_customer_fields_can_be_none(self):
        """TC-09 extension: customer_name/phone/address are Optional[str]."""
        order = OrderOut(
            id=2,
            customer_id=7,
            total_price=120.0,
            payment_method="Bank Transfer",
            status="delivered",
            ordered_at=datetime(2026, 6, 10, 14, 0, 0),
            items=[],
            # omit customer fields
        )

        assert order.customer_name is None
        assert order.customer_phone is None
        assert order.customer_address is None


# 2.4 — StatusUpdate 

class TestStatusUpdate:
    """TC-10 to TC-12 — StatusUpdate schema validation."""

    def test_valid_status_cooking_accepted(self):
        """TC-10: a known status string passes validation."""
        update = StatusUpdate(status="cooking")
        assert update.status == "cooking"

    def test_missing_status_raises_validation_error(self):
        """TC-11: empty body → ValidationError (status is required)."""
        with pytest.raises(ValidationError):
            StatusUpdate()

    def test_any_string_passes_pydantic_validation(self):
        """TC-12: Pydantic accepts any string — server-layer rejects invalid ones."""
        update = StatusUpdate(status="invalid_status")
        assert update.status == "invalid_status"
        # Pydantic does NOT reject — the router rejects at VALID_STATUSES check


# ============================================================
# 2.5 — MenuItemIn & MenuItemOut  (TC-13 – TC-16)
# ============================================================

class MenuItemIn(BaseModel):
    name: str
    category: str
    price: float
    image_url: Optional[str] = None
    is_available: bool = True
    is_special: bool = False


class MenuItemOut(BaseModel):
    id: int
    name: str
    category: str
    price: float
    image_url: Optional[str]
    is_available: bool
    is_special: bool
    model_config = {"from_attributes": True}


class TestMenuItemIn:
    """TC-13 to TC-15 — MenuItemIn schema validation and defaults."""

    def test_valid_menuitem_in_with_all_fields(self):
        """TC-13: all fields provided should be stored correctly."""
        item = MenuItemIn(
            name="Cheese Burger",
            category="Burger",
            price=150.0,
            image_url="https://img.jpg",
            is_available=True,
            is_special=True,
        )

        assert item.name == "Cheese Burger"
        assert item.category == "Burger"
        assert item.price == 150.0
        assert item.image_url == "https://img.jpg"
        assert item.is_available is True
        assert item.is_special is True

    def test_menuitem_in_defaults(self):
        """TC-14: optional fields default correctly."""
        item = MenuItemIn(
            name="Coke",
            category="Drinks",
            price=30.0,
        )

        assert item.is_available is True
        assert item.is_special is False
        assert item.image_url is None

    def test_missing_name_raises_validation_error(self):
        """TC-15: name is required."""
        with pytest.raises(ValidationError):
            MenuItemIn(category="Burger", price=100.0)


class TestMenuItemOut:
    """TC-16 — MenuItemOut from attributes."""

    def test_menuitem_out_from_attributes(self):
        """TC-16: model_validate from a DB-style object."""
        class FakeDbMenuItem:
            def __init__(self):
                self.id = 5
                self.name = "Cheese Burger"
                self.category = "Burger"
                self.price = 120.0
                self.image_url = "https://img.com/cb.jpg"
                self.is_available = True
                self.is_special = False

        db_item = FakeDbMenuItem()
        out = MenuItemOut.model_validate(db_item)

        assert out.id == 5
        assert out.name == "Cheese Burger"
        assert out.category == "Burger"
        assert out.price == 120.0
        assert out.image_url == "https://img.com/cb.jpg"
        assert out.is_available is True
        assert out.is_special is False


# ============================================================
# 2.6 — CustomerOut  (TC-17)
# ============================================================

class CustomerOut(BaseModel):
    id: int
    messenger_id: str
    name: str
    phone: str
    address: str
    created_at: datetime
    total_orders: int = 0
    preferred_menu: Optional[str] = None
    model_config = {"from_attributes": True}


class TestCustomerOut:
    """TC-17 — CustomerOut with optional fields."""

    def test_customer_out_with_preferred_menu(self):
        """TC-17a: preferred_menu set to a value."""
        customer = CustomerOut(
            id=1,
            messenger_id="fb-123",
            name="Hnin Aye",
            phone="091234567",
            address="Bangkok",
            created_at=datetime(2026, 5, 1, 10, 0, 0),
            total_orders=5,
            preferred_menu="Cheese Burger",
        )

        assert customer.total_orders == 5
        assert customer.preferred_menu == "Cheese Burger"

    def test_customer_out_with_none_preferred_menu(self):
        """TC-17b: preferred_menu=None is valid (Optional[str])."""
        customer = CustomerOut(
            id=2,
            messenger_id="fb-456",
            name="John Doe",
            phone="081234567",
            address="Chiang Mai",
            created_at=datetime(2026, 4, 15, 8, 0, 0),
            total_orders=0,
            preferred_menu=None,
        )

        assert customer.total_orders == 0
        assert customer.preferred_menu is None

    def test_customer_out_defaults(self):
        """TC-17 extension: total_orders defaults to 0, preferred_menu to None."""
        customer = CustomerOut(
            id=3,
            messenger_id="fb-789",
            name="May",
            phone="095",
            address="Yangon",
            created_at=datetime(2026, 6, 1, 12, 0, 0),
        )

        assert customer.total_orders == 0
        assert customer.preferred_menu is None
