"""
seed_demo_data.py — Populates the database with realistic demo data for presentation.
Run once before your presentation:
    cd fastapi-backend
    source venv/bin/activate
    python seed_demo_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models.customer import Customer
from models.order import Order, OrderItem
from datetime import datetime, timezone, timedelta
import random

db = SessionLocal()

# ── Clear existing demo data (keeps real orders) ──────────────────────────────
print("Clearing old demo data...")
db.query(OrderItem).delete()
db.query(Order).delete()
db.query(Customer).delete()
db.commit()

# ── Fake customers ────────────────────────────────────────────────────────────
customers_data = [
    ("fake_001", "Jessica Miller",   "0812345678", "Chiang Mai, Nimman"),
    ("fake_002", "Floyd Miles",      "0823456789", "Chiang Mai, Old City"),
    ("fake_003", "Ronald Richards",  "0834567890", "Chiang Mai, Santitham"),
    ("fake_004", "Marvin McKinney",  "0845678901", "Chiang Mai, Hang Dong"),
    ("fake_005", "Jerome Bell",      "0856789012", "Chiang Mai, Suthep"),
    ("fake_006", "Kathryn Murphy",   "0867890123", "Chiang Mai, Nimmanhaemin"),
    ("fake_007", "Jacob Jones",      "0878901234", "Chiang Mai, Mae Hia"),
    ("fake_008", "Alvin Martin",     "0889012345", "Chiang Mai, Kad Suan Kaew"),
    ("fake_009", "Theresa Webb",     "0890123456", "Chiang Mai, Promenada"),
    ("fake_010", "Jenny Wilson",     "0801234567", "Chiang Mai, Maya Mall"),
    ("fake_011", "Wade Warren",      "0812233445", "Chiang Mai, Nong Hoi"),
    ("fake_012", "Cameron Williams", "0823344556", "Chiang Mai, Doi Saket"),
    ("fake_013", "Brooklyn Simmons", "0834455667", "Chiang Mai, San Kamphaeng"),
    ("fake_014", "Leslie Alexander", "0845566778", "Chiang Mai, Hang Dong"),
    ("fake_015", "Cody Fisher",      "0856677889", "Chiang Mai, Mueang"),
]

# ── Menu items to order from ───────────────────────────────────────────────────
menu = [
    ("Classic Burger",      "Burger",        89),
    ("Double Burger",       "Burger",       129),
    ("Cheese Burger",       "Burger",       109),
    ("Crispy Chicken",      "Fried Chicken", 79),
    ("Spicy Chicken",       "Fried Chicken", 79),
    ("Chicken Strips",      "Fried Chicken", 69),
    ("Cola",                "Drinks",        35),
    ("Orange Juice",        "Drinks",        45),
    ("Green Tea",           "Drinks",        40),
    ("Burger + Cola",       "Combo",        109),
    ("Chicken + Cola",      "Combo",         99),
    ("Double Burger + OJ",  "Combo",        159),
]

payments = ["Cash", "Bank Transfer"]
statuses = ["pending", "cooking", "ready", "delivered"]

now = datetime.now(timezone.utc)

print("Seeding customers and orders...")
for i, (messenger_id, name, phone, address) in enumerate(customers_data):
    # Create customer
    customer = Customer(
        messenger_id=messenger_id,
        name=name,
        phone=phone,
        address=address,
        created_at=now - timedelta(days=random.randint(10, 90)),
    )
    db.add(customer)
    db.flush()

    # Each customer places 1–5 orders spread over the past 3 months
    num_orders = random.randint(1, 5)
    for j in range(num_orders):
        days_ago   = random.randint(0, 90)
        hour       = random.choice([11, 12, 13, 18, 19, 20])  # lunch or dinner
        ordered_at = now - timedelta(days=days_ago, hours=random.randint(0, 2)) + timedelta(hours=hour - now.hour)

        item         = random.choice(menu)
        qty          = random.randint(1, 3)
        subtotal     = item[2] * qty
        payment      = random.choice(payments)
        # Most orders are delivered, a few are at other stages
        status = random.choices(
            ["delivered", "delivered", "delivered", "ready", "cooking", "pending"],
            weights=[50, 50, 50, 15, 10, 5]
        )[0]

        order = Order(
            customer_id    = customer.id,
            total_price    = subtotal,
            payment_method = payment,
            status         = status,
            ordered_at     = ordered_at,
        )
        db.add(order)
        db.flush()

        db.add(OrderItem(
            order_id  = order.id,
            item_name = item[0],
            quantity  = qty,
            price     = item[2],
            subtotal  = subtotal,
        ))

db.commit()
db.close()

print("✅ Done! Demo data seeded successfully.")
print("   Open http://localhost:5173 to see the dashboard with full data.")
