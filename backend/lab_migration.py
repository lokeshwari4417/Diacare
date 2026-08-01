"""
Migration script for Phase 1 Lab Report Analysis feature.
Creates new tables (lab_reports, test_results, interpretations, risk_flags, recommendations)
without dropping or touching existing tables.
"""
import os
from sqlalchemy import create_engine
from app.database import Base
from app import models  # Ensures all models are registered with Base.metadata

DATABASE_URL = os.getenv("DIACARE_DATABASE_URL") or os.getenv("DATABASE_URL") or "sqlite:///./diacare.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database for Lab Analysis tables creation...")
engine = create_engine(DATABASE_URL)

# Creates only missing tables (lab_reports, test_results, interpretations, risk_flags, recommendations)
Base.metadata.create_all(bind=engine)
print("Lab Analysis migration completed successfully! All new tables created.")
