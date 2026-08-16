from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import orders, customers, menu, insights, auth, promotions
from database import Base, engine
from sqlalchemy import text
from models import customer, order, menu as menu_model, promotion

app = FastAPI(title="DiningInsight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(menu.router)
app.include_router(insights.router)
app.include_router(auth.router)
app.include_router(promotions.router)

@app.on_event("startup")
def create_promotion_tables():
    """Create the promotion tables for installations without migrations."""
    Base.metadata.create_all(bind=engine)
    # Existing installations may already have the campaign table from Feature #7.
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS message_type VARCHAR(30) NOT NULL DEFAULT 'discount'"))
        connection.execute(text("ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS menu_item_name VARCHAR(100)"))
        connection.execute(text("ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS promotion_value VARCHAR(100)"))
        connection.execute(text("ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE"))

@app.get("/")
def root():
    return {"message": "DiningInsight API is running"}


from fastapi import Depends
from database import get_db
from sqlalchemy.orm import Session
from firebase import verify_firebase_token

@app.post("/admin/claim-existing-data")
def claim_existing_data(db: Session = Depends(get_db), user=Depends(verify_firebase_token)):
    """One-time migration: assign all NULL restaurant_id rows to the current user."""
    from models.customer import Customer
    from models.order import Order
    from models.menu import MenuItem

    uid = user["uid"]
    customers = db.query(Customer).filter(Customer.restaurant_id == None).update({"restaurant_id": uid})
    orders    = db.query(Order).filter(Order.restaurant_id == None).update({"restaurant_id": uid})
    menu      = db.query(MenuItem).filter(MenuItem.restaurant_id == None).update({"restaurant_id": uid})
    db.commit()
    return {"claimed": {"customers": customers, "orders": orders, "menu_items": menu}}
