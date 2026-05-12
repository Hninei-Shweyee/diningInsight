import os, sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
uid = sys.argv[1]
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    for table in ["customers", "orders", "menu_items"]:
        r = conn.execute(text(f"UPDATE {table} SET restaurant_id = :uid WHERE restaurant_id IS NULL"), {"uid": uid})
        print(f"{table}: {r.rowcount} rows updated")
    conn.commit()
print("Done.")
