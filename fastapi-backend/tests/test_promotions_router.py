"""Unit tests for production promotion endpoints with their I/O dependencies mocked."""
import os

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite://")

from fastapi import HTTPException
from routers import promotions
from schemas.promotion import PromotionSendRequest


class Customer:
    def __init__(self, customer_id, name, messenger_id):
        self.id = customer_id
        self.name = name
        self.messenger_id = messenger_id


class FakeCampaign:
    def __init__(self, **values):
        self.__dict__.update(values)
        self.id = None


class FakeRecipient:
    def __init__(self, **values):
        self.__dict__.update(values)


class FakeDb:
    def __init__(self):
        self.added = []
        self.committed = False

    def add(self, value):
        self.added.append(value)

    def flush(self):
        next(campaign for campaign in self.added if isinstance(campaign, FakeCampaign)).id = 41

    def commit(self):
        self.committed = True


def request(**overrides):
    values = {
        "audience": "all", "menu_item_name": "Burger", "message_type": "discount",
        "promotion_value": "10%", "message": "Hi [Customer Name]!",
    }
    values.update(overrides)
    return PromotionSendRequest(**values)


def test_send_promotion_records_sent_failed_and_skipped_recipients(monkeypatch):
    customers = [Customer(1, "Aye", "messenger-1"), Customer(2, "Moe", ""), Customer(3, "Nyein", "messenger-3")]
    db = FakeDb()
    monkeypatch.setattr(promotions, "PromotionCampaign", FakeCampaign)
    monkeypatch.setattr(promotions, "PromotionRecipient", FakeRecipient)
    monkeypatch.setattr(promotions, "_customers_for_audience", lambda *_: customers)
    monkeypatch.setattr(promotions, "_send_messenger_message", lambda messenger_id, message: (messenger_id == "messenger-1", "blocked" if messenger_id == "messenger-3" else None))

    result = promotions.send_promotion(request(), db, {"uid": "restaurant-1"})

    campaign = next(item for item in db.added if isinstance(item, FakeCampaign))
    recipients = [item for item in db.added if isinstance(item, FakeRecipient)]
    assert result == {"id": 41, "status": "partial", "sent_count": 1, "failed_count": 1, "skipped_count": 1, "recipient_count": 3}
    assert campaign.sent_count == 1 and campaign.failed_count == 1 and campaign.skipped_count == 1
    assert [(item.customer_name, item.delivery_status) for item in recipients] == [("Aye", "sent"), ("Moe", "skipped"), ("Nyein", "failed")]
    assert db.committed is True


@pytest.mark.parametrize(("payload", "message"), [
    (request(audience="selected", customer_ids=[]), "Select at least one customer"),
    (request(audience="order_item", menu_item_name=None), "Select a menu item for this customer group"),
    (request(promotion_value=" "), "Enter a discount value"),
])
def test_send_promotion_validates_the_request_before_querying_customers(payload, message):
    with pytest.raises(HTTPException, match=message):
        promotions.send_promotion(payload, FakeDb(), {"uid": "restaurant-1"})


def test_messenger_sender_returns_a_configuration_error_without_a_page_token(monkeypatch):
    monkeypatch.delenv("PAGE_ACCESS_TOKEN", raising=False)

    assert promotions._send_messenger_message("recipient", "hello") == (False, "PAGE_ACCESS_TOKEN is not configured")
