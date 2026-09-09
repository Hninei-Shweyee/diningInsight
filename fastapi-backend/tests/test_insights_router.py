"""Unit tests for production helpers in routers.insights (no database required)."""
import os
from datetime import date, datetime as real_datetime

os.environ.setdefault("DATABASE_URL", "sqlite://")

from routers.insights import _date_bounds, _demand_level, _fmt_hour, _format_item_list


def test_date_bounds_for_custom_range_are_inclusive_of_the_end_date():
    start, end = _date_bounds("custom", "2026-08-01", "2026-08-31")

    assert start.isoformat() == "2026-08-01T00:00:00"
    assert end.isoformat() == "2026-09-01T00:00:00"


def test_date_bounds_for_today_ignore_custom_dates(monkeypatch):
    class FrozenDateTime:
        @classmethod
        def now(cls, tz):
            return type("Now", (), {"date": lambda self: date(2026, 8, 15)})()

        combine = staticmethod(real_datetime.combine)

    monkeypatch.setattr("routers.insights.datetime", FrozenDateTime)
    start, end = _date_bounds("today", "2026-01-01", "2026-01-02")

    assert start.isoformat() == "2026-08-15T00:00:00"
    assert end.isoformat() == "2026-08-16T00:00:00"


def test_hour_formatting_handles_midnight_noon_and_24_hour_wraparound():
    assert [_fmt_hour(hour) for hour in (0, 9, 12, 13, 24)] == ["12am", "9am", "12pm", "1pm", "12am"]


def test_demand_levels_use_the_documented_thresholds():
    assert _demand_level(5) == "Low Demand"
    assert _demand_level(6) == "Moderate Demand"
    assert _demand_level(10) == "High Demand"


def test_item_list_uses_readable_grammar():
    assert _format_item_list([]) == ""
    assert _format_item_list(["Burger"]) == "Burger"
    assert _format_item_list(["Burger", "Cola"]) == "Burger and Cola"
    assert _format_item_list(["Burger", "Cola", "Fries"]) == "Burger, Cola, and Fries"
