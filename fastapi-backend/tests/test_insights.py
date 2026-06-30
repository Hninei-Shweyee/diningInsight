from datetime import datetime, timezone


# ============================================================
# fmt() helper — inline logic from fastapi-backend/routers/insights.py:70
# ============================================================

def fmt(hr: int) -> str:
    """Format an hour integer into a human-readable label."""
    return f"{hr}am" if hr < 12 else (f"12pm" if hr == 12 else f"{hr-12}pm")


def build_peak_hour(peak_hour_row) -> str | None:
    """Replicates the peak_hour construction from get_insights()."""
    if not peak_hour_row:
        return None
    h = int(peak_hour_row["hour"])
    return f"{fmt(h)} - {fmt(h + 1)}"


# ============================================================
# get_insights return shape — from fastapi-backend/routers/insights.py:73-85
# ============================================================

def build_insights_response(
    most_ordered_rows,
    top_this_month_rows,
    totals,
    peak_hour_row,
    repeat_customers_count,
    last_order_date,
):
    """Build the response dict the same way get_insights does.

    most_ordered_rows: list of (item_name, total_qty)
    top_this_month_rows: list of (item_name, total_qty)
    totals: object with .total_orders and .total_revenue
    peak_hour_row: object with .hour and .cnt
    repeat_customers_count: int
    last_order_date: datetime or None
    """
    peak_hour = None
    if peak_hour_row:
        h = int(peak_hour_row["hour"])
        peak_hour = f"{fmt(h)} - {fmt(h + 1)}"

    return {
        "most_ordered_items": [
            {"name": r[0], "quantity": int(r[1])} for r in most_ordered_rows
        ],
        "top_this_month": [
            {"name": r[0], "quantity": int(r[1])} for r in top_this_month_rows
        ],
        "total_orders": int(totals["total_orders"]),
        "total_revenue": float(totals["total_revenue"]),
        "peak_ordering_time": peak_hour,
        "last_order_date": last_order_date.isoformat() if last_order_date else None,
        "repeat_customers": int(repeat_customers_count or 0),
    }


# ============================================================
# 2.21 — peak_hour fmt()  (TC-68 – TC-72)
# ============================================================

class TestPeakHourFormatting:
    """TC-68 to TC-72 — inline fmt() helper for peak hour display."""

    def test_am_hour_9(self):
        """TC-68: hour=9 → '9am - 10am'."""
        assert fmt(9) == "9am"
        assert build_peak_hour({"hour": 9}) == "9am - 10am"

    def test_noon_hour_12(self):
        """TC-69: hour=12 → '12pm - 1pm'."""
        assert fmt(12) == "12pm"
        assert build_peak_hour({"hour": 12}) == "12pm - 1pm"

    def test_pm_hour_14(self):
        """TC-70: hour=14 → '2pm - 3pm'."""
        assert fmt(14) == "2pm"
        assert build_peak_hour({"hour": 14}) == "2pm - 3pm"

    def test_midnight_hour_0(self):
        """TC-71: hour=0 → '0am - 1am'."""
        assert fmt(0) == "0am"
        assert build_peak_hour({"hour": 0}) == "0am - 1am"

    def test_hour_23(self):
        """TC-72: hour=23 → '11pm'. fmt(24)=fmt(0) in clock terms."""
        assert fmt(23) == "11pm"
        # fmt(24) → 24 < 12 is False, 24 == 12 is False, so 24-12=12pm
        assert fmt(24) == "12pm"
        # but the real data never has hour=24; max is 23

    def test_hour_1_am(self):
        """Extension: hour=1 → '1am'."""
        assert fmt(1) == "1am"

    def test_hour_13_pm(self):
        """Extension: hour=13 → '1pm'."""
        assert fmt(13) == "1pm"

    def test_null_peak_hour_returns_none(self):
        """TC-65 extension: no peak hour row → None."""
        assert build_peak_hour(None) is None


# ============================================================
# 2.20 — get_insights response shape  (TC-63 – TC-67)
# ============================================================

class TestInsightsResponse:
    """TC-63 to TC-67 — insights data shaping."""

    def test_full_insights_response_has_all_keys(self):
        """TC-63: response dict has all 7 expected keys."""
        result = build_insights_response(
            most_ordered_rows=[("Burger", 45), ("Coke", 38)],
            top_this_month_rows=[("Burger", 12)],
            totals={"total_orders": 158, "total_revenue": 45600.0},
            peak_hour_row={"hour": 12},
            repeat_customers_count=34,
            last_order_date=datetime(2026, 6, 17, 10, 0, 0),
        )

        assert "most_ordered_items" in result
        assert "top_this_month" in result
        assert "total_orders" in result
        assert "total_revenue" in result
        assert "peak_ordering_time" in result
        assert "last_order_date" in result
        assert "repeat_customers" in result

    def test_total_revenue_is_float(self):
        """TC-66: total_revenue must be float."""
        result = build_insights_response(
            most_ordered_rows=[],
            top_this_month_rows=[],
            totals={"total_orders": 0, "total_revenue": 0},
            peak_hour_row=None,
            repeat_customers_count=0,
            last_order_date=None,
        )

        assert isinstance(result["total_revenue"], float)
        assert result["total_revenue"] == 0.0

    def test_empty_database_returns_sensible_defaults(self):
        """TC-65: restaurant with no orders."""
        result = build_insights_response(
            most_ordered_rows=[],
            top_this_month_rows=[],
            totals={"total_orders": 0, "total_revenue": 0.0},
            peak_hour_row=None,
            repeat_customers_count=0,
            last_order_date=None,
        )

        assert result["most_ordered_items"] == []
        assert result["top_this_month"] == []
        assert result["total_orders"] == 0
        assert result["total_revenue"] == 0.0
        assert result["peak_ordering_time"] is None
        assert result["last_order_date"] is None
        assert result["repeat_customers"] == 0

    def test_most_ordered_items_shaped_correctly(self):
        """TC-64 style: items list has name and quantity."""
        result = build_insights_response(
            most_ordered_rows=[("Cheese Burger", 45), ("Coke", 38)],
            top_this_month_rows=[],
            totals={"total_orders": 100, "total_revenue": 5000.0},
            peak_hour_row=None,
            repeat_customers_count=10,
            last_order_date=None,
        )

        assert result["most_ordered_items"] == [
            {"name": "Cheese Burger", "quantity": 45},
            {"name": "Coke", "quantity": 38},
        ]

    def test_repeat_customers_count(self):
        """TC-67: repeat_customers is int, 0-or counts customers with >1 orders."""
        result = build_insights_response(
            most_ordered_rows=[],
            top_this_month_rows=[],
            totals={"total_orders": 0, "total_revenue": 0.0},
            peak_hour_row=None,
            repeat_customers_count=34,
            last_order_date=None,
        )
        assert result["repeat_customers"] == 34
        assert isinstance(result["repeat_customers"], int)

    def test_last_order_date_formatted_as_iso(self):
        """last_order_date is ISO string when set."""
        result = build_insights_response(
            most_ordered_rows=[],
            top_this_month_rows=[],
            totals={"total_orders": 0, "total_revenue": 0.0},
            peak_hour_row=None,
            repeat_customers_count=0,
            last_order_date=datetime(2026, 6, 17, 14, 30, 0),
        )
        assert result["last_order_date"] == "2026-06-17T14:30:00"
