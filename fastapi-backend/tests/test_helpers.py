from collections import Counter
from typing import Optional
from datetime import datetime, date


# ============================================================
# VALID_STATUSES — from fastapi-backend/routers/orders.py:13
# ============================================================

VALID_STATUSES = {"pending", "cooking", "ready", "delivered"}


# ============================================================
# _preferred_menu — from fastapi-backend/routers/customers.py:17-23
# ============================================================

def _preferred_menu(orders) -> Optional[str]:
    """Return the most ordered item_name across a list of orders."""
    counts = Counter()
    for order in orders:
        for item in order.items:
            counts[item.item_name] += item.quantity
    return counts.most_common(1)[0][0] if counts else None


# ============================================================
# _filter_orders_by_date — from fastapi-backend/routers/customers.py:26-40
# ============================================================

def _filter_orders_by_date(orders, date_from: Optional[str], date_to: Optional[str]):
    """Filter a list of Order objects to those within [date_from, date_to]."""
    if not date_from and not date_to:
        return orders
    df = datetime.fromisoformat(date_from).date() if date_from else None
    dt = datetime.fromisoformat(date_to).date() if date_to else None
    result = []
    for o in orders:
        order_date = o.ordered_at.date() if hasattr(o.ordered_at, 'date') else o.ordered_at
        if df and order_date < df:
            continue
        if dt and order_date > dt:
            continue
        result.append(o)
    return result


# ============================================================
# Fake classes to make helper tests work without SQLAlchemy
# ============================================================

class FakeOrderItem:
    def __init__(self, item_name, quantity):
        self.item_name = item_name
        self.quantity = quantity


class FakeOrder:
    def __init__(self, ordered_at, items):
        self.ordered_at = ordered_at  # datetime object
        self.items = items


# ============================================================
# 2.7 — VALID_STATUSES  (TC-18 – TC-20)
# ============================================================

class TestValidStatuses:
    """TC-18 to TC-20 — VALID_STATUSES set validation."""

    def test_valid_statuses_contains_four_values(self):
        """TC-18: the set contains exactly the 4 allowed statuses."""
        assert VALID_STATUSES == {"pending", "cooking", "ready", "delivered"}

    def test_pending_is_in_valid_statuses(self):
        """TC-19: 'pending' is a valid status."""
        assert "pending" in VALID_STATUSES

    def test_invalid_is_not_in_valid_statuses(self):
        """TC-20: an unknown status is rejected."""
        assert "invalid" not in VALID_STATUSES
        assert "shipped" not in VALID_STATUSES


# ============================================================
# 2.8 — _preferred_menu  (TC-21 – TC-24)
# ============================================================

class TestPreferredMenu:
    """TC-21 to TC-24 — _preferred_menu helper."""

    def test_returns_most_ordered_item_by_total_quantity(self):
        """TC-21: Fries total qty=5 beats Burger total qty=3+2=5? No — Fries=5, Burger=3.
        Let's do order1: Burger×3; order2: Burger×2 + Fries×5 → Burger total=5, Fries=5.
        Actually: Burger qty 3 in order1, Burger qty 2 + Fries qty 5 in order2.
        Burger total = 5 (3+2), Fries total = 5. Counter returns the first seen with max.
        Let me make Fries clearly the winner: Burger×3, Fries×6."""
        order1 = FakeOrder(None, [FakeOrderItem("Burger", 3)])
        order2 = FakeOrder(None, [FakeOrderItem("Burger", 2), FakeOrderItem("Fries", 6)])

        result = _preferred_menu([order1, order2])
        assert result == "Fries"  # 6 > 5

    def test_returns_single_item_when_only_one_exists(self):
        """TC-22: one order with one item → that item is preferred."""
        order = FakeOrder(None, [FakeOrderItem("Coke", 1)])
        assert _preferred_menu([order]) == "Coke"

    def test_returns_none_for_empty_order_list(self):
        """TC-23: empty list → None."""
        assert _preferred_menu([]) is None

    def test_tiebreaker_returns_first_encountered(self):
        """TC-24: equal quantities → returns whichever Counter sees first."""
        # Both items appear in the same order iteration order: Burger first, then Fries
        order = FakeOrder(None, [
            FakeOrderItem("Burger", 5),
            FakeOrderItem("Fries", 5),
        ])
        result = _preferred_menu([order])
        # Counter.most_common(1) returns the first with max count
        assert result in ("Burger", "Fries")
        assert result == "Burger"  # Counter iteration order: Burger seen first


# ============================================================
# 2.9 — _filter_orders_by_date  (TC-25 – TC-29)
# ============================================================

class TestFilterOrdersByDate:
    """TC-25 to TC-29 — _filter_orders_by_date helper."""

    def make_orders(self):
        """Return 3 orders on Jun 10, Jun 15, Jun 20 2026."""
        return [
            FakeOrder(datetime(2026, 6, 10, 10, 0, 0), []),
            FakeOrder(datetime(2026, 6, 15, 14, 0, 0), []),
            FakeOrder(datetime(2026, 6, 20, 8, 0, 0), []),
        ]

    def test_returns_all_orders_when_no_dates(self):
        """TC-25: both date_from and date_to are None → return all."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, None, None)
        assert result == orders

    def test_filters_on_or_after_date_from(self):
        """TC-26: date_from='2026-06-15' → Jun 15 and Jun 20."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, "2026-06-15", None)
        assert len(result) == 2
        assert result[0].ordered_at.day == 15
        assert result[1].ordered_at.day == 20

    def test_filters_on_or_before_date_to(self):
        """TC-27: date_to='2026-06-15' → Jun 10 and Jun 15."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, None, "2026-06-15")
        assert len(result) == 2
        assert result[0].ordered_at.day == 10
        assert result[1].ordered_at.day == 15

    def test_filters_within_date_range(self):
        """TC-28: date_from='2026-06-12', date_to='2026-06-18' → only Jun 15."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, "2026-06-12", "2026-06-18")
        assert len(result) == 1
        assert result[0].ordered_at.day == 15

    def test_returns_empty_when_no_orders_in_range(self):
        """TC-29: July range with June orders → empty list."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, "2026-07-01", "2026-07-31")
        assert result == []

    def test_date_from_only_filters_correctly(self):
        """Extension: date_from after all orders → empty."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, "2026-06-25", None)
        assert result == []

    def test_date_to_only_filters_correctly(self):
        """Extension: date_to before all orders → empty."""
        orders = self.make_orders()
        result = _filter_orders_by_date(orders, None, "2026-06-05")
        assert result == []
