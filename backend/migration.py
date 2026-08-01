import os
from sqlalchemy import create_engine, text

# Get DATABASE_URL from env or default to SQLite
DATABASE_URL = os.getenv("DIACARE_DATABASE_URL", "sqlite:///./diacare.db")

print(f"Connecting to database: {DATABASE_URL}")
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    # 1. Add status column
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'"))
        print("Successfully added status column.")
    except Exception as e:
        # If it fails, print warning (e.g., column already exists)
        print("Note: status column could not be added (it may already exist):", e)

    # 2. Add otp_code column
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN otp_code VARCHAR(10)"))
        print("Successfully added otp_code column.")
    except Exception as e:
        print("Note: otp_code column could not be added (it may already exist):", e)

    # 3. Add otp_expiry column
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP"))
        print("Successfully added otp_expiry column.")
    except Exception as e:
        print("Note: otp_expiry column could not be added (it may already exist):", e)

print("Migration check complete.")
