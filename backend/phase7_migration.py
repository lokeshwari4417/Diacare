"""
Phase 7 Migration: Creates the notifications table for critical alert routing.
"""
import os
from sqlalchemy import create_engine
from app.database import Base
from app import models  # Ensures all models are registered

DATABASE_URL = os.getenv("DIACARE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./diacare.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print("Connecting to database for Phase 7 (notifications table) creation...")
engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)
print("Phase 7 migration completed successfully! Table 'notifications' ensured.")
