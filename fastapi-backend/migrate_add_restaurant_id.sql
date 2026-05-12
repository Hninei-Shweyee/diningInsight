-- Run this once on your existing database to add the restaurant_id column.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE customers   ADD COLUMN IF NOT EXISTS restaurant_id VARCHAR(50);
ALTER TABLE orders      ADD COLUMN IF NOT EXISTS restaurant_id VARCHAR(50);
ALTER TABLE menu_items  ADD COLUMN IF NOT EXISTS restaurant_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS ix_customers_restaurant_id  ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS ix_orders_restaurant_id     ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS ix_menu_items_restaurant_id ON menu_items(restaurant_id);
