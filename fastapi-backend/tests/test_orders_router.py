import pytest
from datetime import datetime


# ============================================================
# Pure logic extracted from fastapi-backend/routers/orders.py
# ============================================================

VALID_STATUSES = {"pending", "cooking", "ready", "delivered"}


# --- update_order_status validation (router logic without DB) ---

def validate_status_update(status: str):
    """Replicates the status validation from the PATCH /orders/{id}/status endpoint.
    Returns (is_valid, error_message)."""
    if status not in VALID_STATUSES:
        return False, f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
    return True, None


# --- list_orders filtering logic ---

def filter_orders_by_status(orders, status: str | None):
    """Replicates the status filter from GET /orders."""
    if not status:
        return orders
    return [o for o in orders if o.status == status]


def sort_orders_by_date(orders):
    """Replicates the ORDER BY ordered_at DESC from list_orders."""
    return sorted(orders, key=lambda o: o.ordered_at, reverse=True)


# --- create_order: build order response ---

def build_create_response(order_id: int) -> dict:
    """The response shape returned by POST /orders."""
    return {"success": True, "order_id": order_id}


# --- build response for update_order_status ---

def build_status_response(order_id: int, status: str) -> dict:
    """The response shape returned by PATCH /orders/{id}/status."""
    return {"success": True, "order_id": order_id, "status": status}


# ============================================================
# Fake classes
# ============================================================

class FakeOrder:
    def __init__(self, id, status, ordered_at):
        self.id = id
        self.status = status
        self.ordered_at = ordered_at  # datetime


# ============================================================
# 2.10 — create_order response  (TC-33)
# ============================================================

class TestCreateOrder:
    """TC-33 — POST /orders response shape."""

    def test_create_order_returns_success_and_order_id(self):
        """TC-33: response is {'success': True, 'order_id': <int>}."""
        result = build_create_response(42)
        assert result == {"success": True, "order_id": 42}
        assert result["success"] is True
        assert isinstance(result["order_id"], int)


# ============================================================
# 2.11 — list_orders filtering  (TC-34 – TC-37)
# ============================================================

class TestListOrdersFiltering:
    """TC-34 to TC-37 — order filtering and sorting (pure logic)."""

    def make_orders(self):
        return [
            FakeOrder(1, "delivered", datetime(2026, 6, 17, 10, 0)),
            FakeOrder(2, "pending",   datetime(2026, 6, 15, 14, 0)),
            FakeOrder(3, "delivered", datetime(2026, 6, 12, 8, 0)),
            FakeOrder(4, "cooking",   datetime(2026, 6, 16, 18, 0)),
        ]

    def test_no_status_filter_returns_all(self):
        """TC-34 equivalent: status=None → all orders returned."""
        orders = self.make_orders()
        result = filter_orders_by_status(orders, None)
        assert len(result) == 4

    def test_filter_by_delivered_status(self):
        """TC-35: status='delivered' → only delivered orders."""
        orders = self.make_orders()
        result = filter_orders_by_status(orders, "delivered")
        assert len(result) == 2
        assert all(o.status == "delivered" for o in result)

    def test_filter_by_status_with_no_match_returns_empty(self):
        """TC-36: status='ready' with no ready orders → []."""
        orders = self.make_orders()
        result = filter_orders_by_status(orders, "ready")
        assert result == []

    def test_orders_sorted_by_date_descending(self):
        """TC-37: ordered_at descending → most recent first."""
        orders = self.make_orders()
        result = sort_orders_by_date(orders)
        assert result[0].id == 1  # Jun 17
        assert result[1].id == 4  # Jun 16
        assert result[2].id == 2  # Jun 15
        assert result[3].id == 3  # Jun 12


# ============================================================
# 2.12 — update_order_status validation  (TC-38 – TC-41)
# ============================================================

class TestUpdateOrderStatus:
    """TC-38 to TC-41 — status update validation (pure logic, no DB)."""

    def test_valid_status_cooking_accepted(self):
        """TC-38: 'cooking' is a valid status."""
        is_valid, error = validate_status_update("cooking")
        assert is_valid is True
        assert error is None

    def test_valid_status_delivered_accepted(self):
        """TC-38 extension: 'delivered' is valid."""
        is_valid, _ = validate_status_update("delivered")
        assert is_valid is True

    def test_invalid_status_rejected_with_message(self):
        """TC-39: 'shipped' is not in VALID_STATUSES."""
        is_valid, error = validate_status_update("shipped")
        assert is_valid is False
        assert "Invalid status" in error
        assert "cooking" in error
        assert "pending" in error
        assert "delivered" in error
        assert "ready" in error

    def test_build_status_response_shape(self):
        """TC-38 response shape: success, order_id, status."""
        result = build_status_response(1, "cooking")
        assert result == {"success": True, "order_id": 1, "status": "cooking"}

    def test_all_four_valid_statuses_accepted(self):
        """All four VALID_STATUSES pass validation."""
        for status in VALID_STATUSES:
            is_valid, error = validate_status_update(status)
            assert is_valid is True, f"'{status}' should be valid"
            assert error is None

    def test_empty_string_rejected(self):
        """Empty string is not in VALID_STATUSES."""
        is_valid, error = validate_status_update("")
        assert is_valid is False
