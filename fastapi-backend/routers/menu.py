# routers/menu.py — Menu management endpoints
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from firebase import verify_firebase_token
from models.menu import MenuItem
from schemas.menu import MenuItemIn, MenuItemOut

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.get("/public", response_model=list[MenuItemOut])
def list_public_menu(
    restaurant_id: str,
    available_only: bool = False,
    db: Session = Depends(get_db),
):
    """Public: menu for the bot — no auth required."""
    query = db.query(MenuItem).filter_by(restaurant_id=restaurant_id)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    return query.order_by(MenuItem.category, MenuItem.name).all()

@router.get("", response_model=list[MenuItemOut])
def list_menu(
    category: str = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: get menu items for the authenticated restaurant."""
    query = db.query(MenuItem).filter_by(restaurant_id=user["uid"])
    if category:
        query = query.filter(MenuItem.category == category)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    return query.order_by(MenuItem.category, MenuItem.name).all()

@router.post("", response_model=MenuItemOut)
def create_menu_item(
    body: MenuItemIn,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: add a new menu item for the authenticated restaurant."""
    item = MenuItem(**body.model_dump(), restaurant_id=user["uid"])
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=MenuItemOut)
def update_menu_item(
    item_id: int,
    body: MenuItemIn,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: edit a menu item belonging to the authenticated restaurant."""
    item = db.query(MenuItem).filter_by(id=item_id, restaurant_id=user["uid"]).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    for key, val in body.model_dump().items():
        setattr(item, key, val)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", response_model=dict)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    user=Depends(verify_firebase_token),
):
    """Dashboard: delete a menu item belonging to the authenticated restaurant."""
    item = db.query(MenuItem).filter_by(id=item_id, restaurant_id=user["uid"]).first()
    if not item:
        raise HTTPException(404, "Menu item not found")
    db.delete(item)
    db.commit()
    return {"success": True}
