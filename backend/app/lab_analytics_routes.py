"""
Phase 8 API Routes for Visual Analytics & Dashboard Trends.
Provides dashboard aggregation endpoints for both patient app and physician portal.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user
from .lab_doctor_auth import get_current_doctor
from . import models
from .lab_analytics import get_dashboard_summary

router = APIRouter(prefix="/v1", tags=["analytics-dashboard"])


@router.get("/patients/{patient_id}/dashboard")
def get_patient_dashboard_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Patient dashboard aggregation endpoint returning test summaries, longitudinal trends,
    and risk flag timeline for charting.
    """
    if patient_id != user.id and user.role.value not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to access this dashboard")

    return get_dashboard_summary(db, patient_id)


@router.get("/doctors/patients/{patient_id}/dashboard")
def get_doctor_patient_dashboard_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    """
    Doctor portal dashboard aggregation endpoint for a linked patient.
    Enforces that an accepted doctor-patient link exists before returning data.
    """
    link = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.patient_id == patient_id)
        .filter(
            (models.DoctorPatientLink.doctor_id == doctor.id) |
            (models.DoctorPatientLink.doctor_email == doctor.email)
        )
        .filter(models.DoctorPatientLink.status == "accepted")
        .first()
    )
    if not link:
        raise HTTPException(status_code=403, detail="Doctor access forbidden. Patient link is not accepted.")

    return get_dashboard_summary(db, patient_id)
