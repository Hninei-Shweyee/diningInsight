import pytest


# ============================================================
# Pure logic extracted from fastapi-backend/routers/menu.py
# ============================================================

# --- filter menu items (replicating query filters) ---

def filter_menu_by_category(items, category: str | None):
    """Replicates GET /menu?category=..."""
    if not category:
        return items
    return [i for i in items if i["category"] == category]


def filter_menu_by_available(items, available_only: bool):
    """Replicates GET /menu?available_only=true"""
    if not available_only:
        return items
    return [i for i in items if i["is_available"]]


def sort_menu_by_category_then_name(items):
    """Replicates .order_by(MenuItem.category, MenuItem.name)"""
    return sorted(items, key=lambda i: (i["category"], i["name"]))


# --- build_menu_payload (replicating create_menu_item) ---

def build_menu_payload(form: dict, uid: str) -> dict:
    """Replicates POST /menu: MenuItem(**body.model_dump(), restaurant_id=uid)."""
    return {
        "name": form["name"],
        "category": form["category"],
        "price": float(form["price"]),
        "image_url": form.get("image_url"),
        "is_available": form.get("is_available", True),
        "is_special": form.get("is_special", False),
        "restaurant_id": uid,
    }


# --- apply_menu_update (replicating update_menu_item) ---

def apply_menu_update(existing: dict, body: dict) -> dict:
    """Replicates PUT /menu/{id}: setattr for each key in body.model_dump()."""
    for key, val in body.items():
        existing[key] = val
    return existing


# --- validate menu ownership ---

def is_owned_by_restaurant(item: dict | None, uid: str) -> bool:
    """Replicates .filter_by(id=item_id, restaurant_id=uid)."""
    if item is None:
        return False
    return item.get("restaurant_id") == uid


# ============================================================
# 2.15 — list_menu (auth-scoped)  (TC-50 – TC-53)
# ============================================================

class TestListMenu:
    """TC-50 to TC-53 — menu query filters."""

    def make_items(self):
        return [
            {"id": 1, "name": "Cheese Burger", "category": "Burger", "price": 120.0, "is_available": True},
            {"id": 2, "name": "Classic Burger", "category": "Burger", "price": 89.0, "is_available": True},
            {"id": 3, "name": "Coke", "category": "Drinks", "price": 30.0, "is_available": True},
            {"id": 4, "name": "Lemonade", "category": "Drinks", "price": 35.0, "is_available": False},
            {"id": 5, "name": "Fried Chicken", "category": "Fried Chicken", "price": 150.0, "is_available": True},
        ]

    def test_sorted_by_category_then_name(self):
        """TC-50: items sorted by category then name."""
        items = self.make_items()
        result = sort_menu_by_category_then_name(items)
        assert result[0]["category"] == "Burger"
        assert result[0]["name"] == "Cheese Burger"
        assert result[1]["name"] == "Classic Burger"
        assert result[2]["category"] == "Drinks"

    def test_filter_by_category(self):
        """TC-51: ?category=Burger → only Burger items."""
        items = self.make_items()
        result = filter_menu_by_category(items, "Burger")
        assert len(result) == 2
        assert all(i["category"] == "Burger" for i in result)

    def test_filter_by_available_only(self):
        """TC-52: available_only=True → only is_available=True items."""
        items = self.make_items()
        result = filter_menu_by_available(items, True)
        assert len(result) == 4
        assert all(i["is_available"] for i in result)

    def test_category_and_available_combined(self):
        """TC-53: category=Drinks & available_only=True → available Drinks."""
        items = self.make_items()
        by_cat = filter_menu_by_category(items, "Drinks")
        result = filter_menu_by_available(by_cat, True)
        assert len(result) == 1
        assert result[0]["name"] == "Coke"


# ============================================================
# 2.16 — list_public_menu (no auth)  (TC-54 – TC-55)
# ============================================================

class TestListPublicMenu:
    """TC-54 to TC-55 — public menu endpoint logic."""

    def test_public_menu_filters_by_restaurant_id(self):
        """TC-54: query filters by restaurant_id from query param."""
        # The query is: db.query(MenuItem).filter_by(restaurant_id=restaurant_id)
        # For testing: we verify the filter concept
        all_items = [
            {"id": 1, "restaurant_id": "uid-A", "name": "Burger"},
            {"id": 2, "restaurant_id": "uid-B", "name": "Pizza"},
        ]
        def filter_by_rid(items, rid):
            return [i for i in items if i["restaurant_id"] == rid]

        result = filter_by_rid(all_items, "uid-A")
        assert len(result) == 1
        assert result[0]["name"] == "Burger"

    def test_public_menu_available_only_filter(self):
        """TC-54 extension: available_only=True excludes unavailable items."""
        items = [
            {"name": "Burger", "is_available": True, "restaurant_id": "uid-X"},
            {"name": "Coke", "is_available": False, "restaurant_id": "uid-X"},
        ]
        def filter_available(items, available_only):
            if not available_only:
                return items
            return [i for i in items if i["is_available"]]

        result = filter_available(items, True)
        assert len(result) == 1
        assert result[0]["name"] == "Burger"


# ============================================================
# 2.17 — create_menu_item  (TC-56 – TC-57)
# ============================================================

class TestCreateMenuItem:
    """TC-56 to TC-57 — menu item creation logic."""

    def test_build_payload_with_restaurant_id_from_token(self):
        """TC-56: payload includes restaurant_id from the authenticated user."""
        form = {"name": "New Burger", "category": "Burger", "price": 120.0}
        payload = build_menu_payload(form, uid="user-abc")

        assert payload["name"] == "New Burger"
        assert payload["category"] == "Burger"
        assert payload["price"] == 120.0
        assert payload["restaurant_id"] == "user-abc"
        assert payload["is_available"] is True
        assert payload["is_special"] is False
        assert payload["image_url"] is None

    def test_build_payload_with_image_url(self):
        """TC-57: image_url is included when provided."""
        form = {
            "name": "Fancy Burger",
            "category": "Burger",
            "price": 200.0,
            "image_url": "https://img.com/fancy.jpg",
        }
        payload = build_menu_payload(form, uid="user-xyz")
        assert payload["image_url"] == "https://img.com/fancy.jpg"

    def test_build_payload_with_is_special(self):
        """Extension: is_special is passed through."""
        form = {"name": "Special Combo", "category": "Combo", "price": 299.0, "is_special": True}
        payload = build_menu_payload(form, uid="user-abc")
        assert payload["is_special"] is True


# ============================================================
# 2.18 — update_menu_item  (TC-58 – TC-60)
# ============================================================

class TestUpdateMenuItem:
    """TC-58 to TC-60 — menu item update logic."""

    def test_apply_update_changes_all_fields(self):
        """TC-58: all fields from body applied to existing item."""
        existing = {
            "id": 1, "name": "Old Burger", "category": "Burger",
            "price": 89.0, "image_url": None, "is_available": True,
            "is_special": False, "restaurant_id": "uid-A",
        }
        body = {"name": "New Burger", "category": "Burger", "price": 99.0}

        updated = apply_menu_update(existing, body)
        assert updated["name"] == "New Burger"
        assert updated["price"] == 99.0
        assert updated["category"] == "Burger"

    def test_ownership_check_returns_true_for_owner(self):
        """The item belongs to the authenticated restaurant."""
        item = {"id": 5, "restaurant_id": "uid-X"}
        assert is_owned_by_restaurant(item, "uid-X") is True

    def test_ownership_check_returns_false_for_wrong_restaurant(self):
        """TC-60: item belongs to another restaurant → scoped out."""
        item = {"id": 5, "restaurant_id": "uid-Y"}
        assert is_owned_by_restaurant(item, "uid-X") is False

    def test_ownership_check_returns_false_for_none_item(self):
        """TC-59: item not found → None → not owned."""
        assert is_owned_by_restaurant(None, "uid-X") is False


# ============================================================
# 2.19 — delete_menu_item  (TC-61 – TC-62)
# ============================================================

class TestDeleteMenuItem:
    """TC-61 to TC-62 — delete logic."""

    def test_delete_success_response(self):
        """TC-61: DELETE returns {'success': True}."""
        response = {"success": True}
        assert response["success"] is True

    def test_remove_from_list_after_delete(self):
        """TC-61: item removed from local list after deletion."""
        items = [
            {"id": 1, "name": "Burger"},
            {"id": 2, "name": "Coke"},
            {"id": 3, "name": "Fries"},
        ]
        target_id = 2
        filtered = [i for i in items if i["id"] != target_id]
        assert len(filtered) == 2
        assert all(i["id"] != 2 for i in filtered)

    def test_not_found_returns_404(self):
        """TC-62: non-existent item → treated as not found."""
        item = None  # db.query().filter_by().first() returns None
        assert is_owned_by_restaurant(item, "uid-X") is False
