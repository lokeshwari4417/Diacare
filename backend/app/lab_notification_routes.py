"""
Phase 7 API Routes for In-App Critical Alert Notifications.
Provides endpoints for patients and doctors to fetch and mark notifications as read.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user
from .lab_doctor_auth import get_current_doctor
from . import models
from .lab_notifications import (
    get_user_notifications, mark_notification_as_read, mark_all_notifications_as_read
)

router = APIRouter(prefix="/v1", tags=["notifications"])


# Patient Notification Endpoints
@router.get("/notifications")
def get_patient_notifications_endpoint(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Retrieves patient in-app notifications with unread count."""
    return get_user_notifications(db, recipient_id=user.id, recipient_type="patient")


@router.post("/notifications/read-all")
def mark_all_patient_notifications_read_endpoint(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Marks all patient notifications as read."""
    return mark_all_notifications_as_read(db, recipient_id=user.id, recipient_type="patient")


# Doctor Notification Endpoints
@router.get("/doctors/me/notifications")
def get_doctor_notifications_endpoint(
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    """Retrieves doctor in-app notifications with unread count."""
    return get_user_notifications(db, recipient_id=doctor.id, recipient_type="doctor")


@router.post("/doctors/me/notifications/read-all")
def mark_all_doctor_notifications_read_endpoint(
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    """Marks all doctor notifications as read."""
    return mark_all_notifications_as_read(db, recipient_id=doctor.id, recipient_type="doctor")


# Shared Notification Read Endpoint (Patient or Doctor)
@router.post("/notifications/{notification_id}/read")
def mark_single_notification_read_endpoint(
    notification_id: str,
    db: Session = Depends(get_db),
):
    """Marks a single notification as read."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notif.read_at is None:
        from datetime import datetime
        notif.read_at = datetime.utcnow()
        db.commit()

    return {"id": notif.id, "status": "read"}
