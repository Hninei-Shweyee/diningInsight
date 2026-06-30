from datetime import datetime
from collections import Counter


# Pure logic extracted from fastapi-backend/routers/customers.py
# These are the sort, filter, and data-shaping layers — no DB needed.


# --- sort helpers replicating list_customers sort logic ---

def sort_customers(customers, sort_by: str | None):
    """Replicates the sort logic from list_customers:70-77.
    customers is a list of dicts with keys: total_orders, id."""
    if sort_by == "most_frequent":
        return sorted(customers, key=lambda x: (x["total_orders"], x["id"]), reverse=True)
    elif sort_by == "least_frequent":
        return sorted(customers, key=lambda x: (x["total_orders"], -x["id"]))
    else:
        # default: by id descending
        return sorted(customers, key=lambda x: x["id"], reverse=True)


def filter_customers_with_date_range(customers, orders_by_customer, date_from, date_to):
    """Replicates: if (sort_by or date_from or date_to) and not orders → skip."""
    # This is a simplified representation — the real code filters orders
    # then removes customers with zero matching orders.
    # For testing, we just test the concept: customers with no orders in range are excluded.
    result = []
    for c in customers:
        orders = orders_by_customer.get(c["id"], [])
        if date_from or date_to:
            if not orders:  # no matching orders → skip
                continue
        c_copy = dict(c)
        c_copy["total_orders"] = len(orders)
        result.append(c_copy)
    return result


# --- build_customer_profile replicating get_customer:124-134 ---

def build_customer_profile(customer_data, orders_data):
    """Replicates get_customer response building.
    customer_data: dict with id, messenger_id, name, phone, address, created_at
    orders_data: list of order dicts, each with id, total_price, payment_method,
                 status, ordered_at (datetime), items (list of item dicts).
    """
    orders = sorted(orders_data, key=lambda o: o["ordered_at"], reverse=True)

    order_history = []
    for o in orders:
        order_history.append({
            "id": o["id"],
            "total_price": float(o["total_price"]),
            "payment_method": o["payment_method"],
            "status": o["status"],
            "ordered_at": o["ordered_at"].isoformat(),
            "items": [
                {
                    "item_name": i["item_name"],
                    "quantity": i["quantity"],
                    "price": float(i["price"]),
                    "subtotal": float(i["subtotal"]),
                }
                for i in o["items"]
            ],
        })

    # preferred_menu computation
    counts = Counter()
    for o in orders:
        for i in o["items"]:
            counts[i["item_name"]] += i["quantity"]
    preferred = counts.most_common(1)[0][0] if counts else None

    return {
        "id": customer_data["id"],
        "messenger_id": customer_data["messenger_id"],
        "name": customer_data["name"],
        "phone": customer_data["phone"],
        "address": customer_data["address"],
        "created_at": customer_data["created_at"].isoformat(),
        "total_orders": len(orders),
        "preferred_menu": preferred,
        "orders": order_history,
    }


# ============================================================
# 2.13 — list_customers sorting  (TC-42 – TC-45)
# ============================================================

class TestListCustomersSorting:
    """TC-42 to TC-45 — list_customers sort and filter logic."""

    def make_customers(self):
        return [
            {"id": 1, "name": "Alice", "total_orders": 10},
            {"id": 2, "name": "Bob",   "total_orders": 5},
            {"id": 3, "name": "Carol", "total_orders": 15},
        ]

    def test_default_sort_by_id_descending(self):
        """TC-42: no sort_by → sorted by id descending."""
        customers = self.make_customers()
        result = sort_customers(customers, None)
        assert result[0]["id"] == 3
        assert result[1]["id"] == 2
        assert result[2]["id"] == 1

    def test_sort_by_most_frequent(self):
        """TC-43: most_frequent → total_orders descending, id descending."""
        customers = self.make_customers()
        result = sort_customers(customers, "most_frequent")
        assert result[0]["id"] == 3  # 15 orders
        assert result[1]["id"] == 1  # 10 orders
        assert result[2]["id"] == 2  # 5 orders

    def test_sort_by_least_frequent(self):
        """TC-44: least_frequent → total_orders ascending."""
        customers = self.make_customers()
        result = sort_customers(customers, "least_frequent")
        assert result[0]["id"] == 2  # 5 orders
        assert result[1]["id"] == 1  # 10 orders
        assert result[2]["id"] == 3  # 15 orders

    def test_most_frequent_tiebreaker_uses_id_desc(self):
        """TC-43 extension: same total_orders → resolved by id descending."""
        customers = [
            {"id": 10, "name": "A", "total_orders": 5},
            {"id": 20, "name": "B", "total_orders": 5},
        ]
        result = sort_customers(customers, "most_frequent")
        assert result[0]["id"] == 20  # higher id first
        assert result[1]["id"] == 10

    def test_least_frequent_tiebreaker_uses_id_desc(self):
        """TC-44 extension: same total_orders → key is (total_orders, -id).
        Since -20 < -10, (5, -20) < (5, -10), so id=20 sorts before id=10."""
        customers = [
            {"id": 10, "name": "A", "total_orders": 5},
            {"id": 20, "name": "B", "total_orders": 5},
        ]
        result = sort_customers(customers, "least_frequent")
        # Both have total_orders=5. Key is (5, -10) and (5, -20).
        # -20 < -10, so id=20 comes first (descending by id).
        assert result[0]["id"] == 20
        assert result[1]["id"] == 10

    def test_date_filter_excludes_customers_with_zero_orders_in_range(self):
        """TC-45: customers with no orders in the date range are excluded."""
        customers = [
            {"id": 1, "name": "Alice", "total_orders": 0},
            {"id": 2, "name": "Bob",   "total_orders": 0},
        ]
        orders_by_customer = {
            1: [],        # Alice has no orders in this range
            2: [{"id": 1}],  # Bob has one order in this range
        }
        result = filter_customers_with_date_range(
            customers, orders_by_customer,
            date_from="2026-06-15", date_to="2026-06-17",
        )
        assert len(result) == 1
        assert result[0]["id"] == 2


# ============================================================
# 2.14 — get_customer  (TC-46 – TC-49)
# ============================================================

class TestGetCustomer:
    """TC-46 to TC-49 — get_customer profile building."""

    def make_customer_data(self):
        return {
            "id": 1,
            "messenger_id": "fb-123",
            "name": "Hnin Aye",
            "phone": "091234567",
            "address": "Bangkok",
            "created_at": datetime(2026, 5, 1, 10, 0, 0),
        }

    def make_orders_data(self):
        return [
            {
                "id": 101,
                "total_price": 350,
                "payment_method": "Cash",
                "status": "delivered",
                "ordered_at": datetime(2026, 6, 17, 10, 30),
                "items": [
                    {"item_name": "Cheese Burger", "quantity": 2, "price": 150, "subtotal": 300},
                    {"item_name": "Coke", "quantity": 1, "price": 50, "subtotal": 50},
                ],
            },
            {
                "id": 100,
                "total_price": 120,
                "payment_method": "Bank Transfer",
                "status": "delivered",
                "ordered_at": datetime(2026, 6, 10, 14, 0),
                "items": [
                    {"item_name": "Fried Chicken", "quantity": 1, "price": 120, "subtotal": 120},
                ],
            },
        ]

    def test_full_customer_profile_has_all_fields(self):
        """TC-46: response includes all customer + order fields."""
        result = build_customer_profile(self.make_customer_data(), self.make_orders_data())

        assert result["id"] == 1
        assert result["name"] == "Hnin Aye"
        assert result["phone"] == "091234567"
        assert result["address"] == "Bangkok"
        assert result["created_at"] == "2026-05-01T10:00:00"
        assert result["total_orders"] == 2
        assert result["preferred_menu"] is not None
        assert len(result["orders"]) == 2

    def test_orders_sorted_most_recent_first(self):
        """TC-48: order history sorted by ordered_at descending."""
        result = build_customer_profile(self.make_customer_data(), self.make_orders_data())

        orders = result["orders"]
        assert len(orders) == 2
        assert orders[0]["id"] == 101  # Jun 17
        assert orders[1]["id"] == 100  # Jun 10

    def test_order_items_have_correct_shape(self):
        """TC-49: each order item has item_name, quantity, price, subtotal as float."""
        result = build_customer_profile(self.make_customer_data(), self.make_orders_data())

        items = result["orders"][0]["items"]
        assert len(items) == 2

        assert items[0]["item_name"] == "Cheese Burger"
        assert items[0]["quantity"] == 2
        assert isinstance(items[0]["price"], float)
        assert items[0]["price"] == 150.0
        assert isinstance(items[0]["subtotal"], float)
        assert items[0]["subtotal"] == 300.0

    def test_preferred_menu_is_most_ordered_item(self):
        """preferred_menu computed via Counter of item_name across all orders."""
        result = build_customer_profile(self.make_customer_data(), self.make_orders_data())
        # Cheese Burger total qty = 2, Fried Chicken = 1 → Cheese Burger wins
        assert result["preferred_menu"] == "Cheese Burger"

    def test_no_orders_returns_empty_history_and_null_preferred(self):
        """TC-46 extension: empty orders list."""
        result = build_customer_profile(self.make_customer_data(), [])

        assert result["total_orders"] == 0
        assert result["preferred_menu"] is None
        assert result["orders"] == []

    def test_prices_and_subtotals_are_float(self):
        """TC-49: all monetary values are float type."""
        result = build_customer_profile(self.make_customer_data(), self.make_orders_data())
        assert isinstance(result["orders"][0]["total_price"], float)
        assert isinstance(result["orders"][0]["items"][0]["price"], float)
        assert isinstance(result["orders"][0]["items"][0]["subtotal"], float)
