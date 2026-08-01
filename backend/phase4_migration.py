"""
Phase 4 Migration: Creates the report_shares table.
"""
import os
from sqlalchemy import create_engine
from app.database import Base
from app import models  # Ensures all models are registered

DATABASE_URL = os.getenv("DIACARE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./diacare.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print("Connecting to database for Phase 4 (report_shares table) creation...")
engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)
print("Phase 4 migration completed successfully! Table 'report_shares' ensured.")
