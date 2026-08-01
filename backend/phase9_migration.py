"""
Phase 9 Migration: Creates the audit_logs table for HIPAA-style access tracking.
"""
import os
from sqlalchemy import create_engine
from app.database import Base
from app import models  # Ensures all models are registered

DATABASE_URL = os.getenv("DIACARE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./diacare.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgres://", 1)

print("Connecting to database for Phase 9 (audit_logs table) creation...")
engine = create_engine(DATABASE_URL)

Base.metadata.create_all(bind=engine)
print("Phase 9 migration completed successfully! Table 'audit_logs' ensured.")
