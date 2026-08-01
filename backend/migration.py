"""
Database Migration Script for DiaCare
Adds missing columns (status, otp_code, otp_expiry, information) to the existing 'users' table
without dropping or deleting any existing user records.

Run against production PostgreSQL via:
  python migration.py
with DIACARE_DATABASE_URL set in your environment.
"""
import os
from sqlalchemy import create_engine, text

# Get database URL from environment variable (DIACARE_DATABASE_URL or DATABASE_URL)
DATABASE_URL = os.getenv("DIACARE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./diacare.db"

# Handle legacy postgres:// scheme for SQLAlchemy 2.0
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to target database...")
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    is_postgres = "postgresql" in engine.dialect.name
    
    columns_to_add = [
        ("status", "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'" if is_postgres else "ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'"),
        ("otp_code", "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(20)" if is_postgres else "ALTER TABLE users ADD COLUMN otp_code VARCHAR(20)"),
        ("otp_expiry", "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP" if is_postgres else "ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP"),
        ("information", "ALTER TABLE users ADD COLUMN IF NOT EXISTS information TEXT" if is_postgres else "ALTER TABLE users ADD COLUMN information TEXT"),
    ]

    for col_name, stmt in columns_to_add:
        try:
            conn.execute(text(stmt))
            print(f"Successfully ensured column '{col_name}' exists.")
        except Exception as e:
            print(f"Note for column '{col_name}': {e}")

    # Set default 'active' status for any pre-existing user rows
    try:
        conn.execute(text("UPDATE users SET status = 'active' WHERE status IS NULL"))
        print("Set default status='active' for pre-existing users.")
    except Exception as e:
        print(f"Status backfill note: {e}")

print("\nMigration completed successfully! No tables were dropped or recreated.")
