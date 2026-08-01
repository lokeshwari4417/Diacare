"""
SQLAlchemy ORM models.

Notes on data-minimization (Section 9 of the spec):
- We only persist what each role's workflow explicitly needs.
- Uploaded scan images are never persisted to disk/DB -- the mock scan
  service reads the bytes in-memory, returns extracted values, and the
  image is discarded. Only the confirmed numeric values are stored.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_id():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    ngo = "ngo"
    admin = "admin"


class ReportStatus(str, enum.Enum):
    draft = "draft"
    submitted_by_ngo = "submitted_by_ngo"
    reviewed_by_doctor = "reviewed_by_doctor"
    finalized = "finalized"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    information = Column(Text, nullable=True)  # free-text profile "Information" field
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active", nullable=False)  # "active" | "pending" | "rejected"
    otp_code = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


    # For patient users created & managed by a doctor/NGO worker
    managed_by_id = Column(String, ForeignKey("users.id"), nullable=True)

    reports = relationship(
        "Report", back_populates="patient", foreign_keys="Report.patient_id"
    )


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_id)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)

    # 8-feature clinical schema (Section 4)
    pregnancies = Column(Integer, nullable=False)
    glucose = Column(Float, nullable=False)
    blood_pressure = Column(Float, nullable=False)
    skin_thickness = Column(Float, nullable=False)
    insulin = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    diabetes_pedigree_function = Column(Float, nullable=False)
    age = Column(Integer, nullable=False)

    probability = Column(Float, nullable=False)
    risk_band = Column(String, nullable=False)

    source = Column(String, default="manual")  # "manual" | "scan"
    status = Column(Enum(ReportStatus), default=ReportStatus.draft)

    # simple audit trail (Section 3.2)
    last_updated_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id], back_populates="reports")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=gen_id)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    status = Column(String, default="confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
