# main.py — FastAPI application entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import orders, customers, menu, insights, auth

app = FastAPI(title="DiningInsight API", version="1.0.0")

# Allow Vue.js dashboard (and the bot) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this to your dashboard URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(menu.router)
app.include_router(insights.router)
app.include_router(auth.router)

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
