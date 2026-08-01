"""
Phase 2 Migration: Adds source_file_path and source_type columns to the lab_reports table.
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DIACARE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./diacare.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print("Connecting to database for Phase 2 Lab Analysis schema update...")
engine = create_engine(DATABASE_URL)

with engine.begin() as conn:
    is_postgres = "postgresql" in engine.dialect.name
    columns = [
        ("source_file_path", "ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS source_file_path VARCHAR(500)" if is_postgres else "ALTER TABLE lab_reports ADD COLUMN source_file_path VARCHAR(500)"),
        ("source_type", "ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS source_type VARCHAR(20)" if is_postgres else "ALTER TABLE lab_reports ADD COLUMN source_type VARCHAR(20)"),
    ]
    for col, stmt in columns:
        try:
            conn.execute(text(stmt))
            print(f"Ensured column '{col}' exists in lab_reports.")
        except Exception as e:
            print(f"Note for column '{col}': {e}")

print("Phase 2 migration completed successfully.")
