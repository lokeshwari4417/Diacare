"""
Phase 7 Notification Service & Critical Alert Trigger Logic.
Creates in-app notifications for patients and linked doctors when critical risk flags are detected.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from . import models

CRITICAL_LIKELIHOOD = "high"


def is_flag_critical(flag: models.LabRiskFlag) -> bool:
    """Determines if a LabRiskFlag is critical based on likelihood_enum or condition criteria."""
    if not flag:
        return False
    if flag.likelihood_enum and flag.likelihood_enum.lower() == CRITICAL_LIKELIHOOD:
        return True
    clean_name = flag.condition_name.lower()
    if "diabetes" in clean_name and "prediabetes" not in clean_name:
        return True
    return False


def check_and_notify_critical_flags(db: Session, report_id: str) -> List[Dict[str, Any]]:
    """
    Evaluates risk flags written for report_id and creates in-app notifications for:
      1) The patient
      2) All doctors with an accepted link to that patient
    Idempotent: prevents duplicate notifications if executed multiple times.
    """
    report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not report:
        return []

    patient = db.query(models.User).filter(models.User.id == report.patient_id).first()
    patient_name = patient.name if patient else "Patient"

    risk_flags = db.query(models.LabRiskFlag).filter(models.LabRiskFlag.report_id == report_id).all()
    created_notifications = []

    # Find accepted linked doctors for this patient
    accepted_doctor_links = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.patient_id == report.patient_id)
        .filter(models.DoctorPatientLink.status == "accepted")
        .filter(models.DoctorPatientLink.doctor_id != None)
        .all()
    )

    for flag in risk_flags:
        if not is_flag_critical(flag):
            continue

        # 1. Patient Notification
        existing_patient_notif = (
            db.query(models.Notification)
            .filter(models.Notification.recipient_type == "patient")
            .filter(models.Notification.recipient_id == report.patient_id)
            .filter(models.Notification.report_id == report_id)
            .filter(models.Notification.risk_flag_id == flag.id)
            .first()
        )
        if not existing_patient_notif:
            p_notif = models.Notification(
                recipient_type="patient",
                recipient_id=report.patient_id,
                report_id=report_id,
                risk_flag_id=flag.id,
                message=f"🚨 Critical Health Alert: {flag.condition_name} detected in your recent lab report ({report.report_date}).",
                delivered_via="in_app",
            )
            db.add(p_notif)
            created_notifications.append(p_notif)

        # 2. Doctor Notifications
        for dlink in accepted_doctor_links:
            existing_doc_notif = (
                db.query(models.Notification)
                .filter(models.Notification.recipient_type == "doctor")
                .filter(models.Notification.recipient_id == dlink.doctor_id)
                .filter(models.Notification.report_id == report_id)
                .filter(models.Notification.risk_flag_id == flag.id)
                .first()
            )
            if not existing_doc_notif:
                d_notif = models.Notification(
                    recipient_type="doctor",
                    recipient_id=dlink.doctor_id,
                    report_id=report_id,
                    risk_flag_id=flag.id,
                    message=f"🚨 Critical Patient Alert: {patient_name} has a critical flag ({flag.condition_name}) in lab report ({report.report_date}).",
                    delivered_via="in_app",
                )
                db.add(d_notif)
                created_notifications.append(d_notif)

    if created_notifications:
        db.commit()

    return [
        {
            "id": n.id,
            "recipient_type": n.recipient_type,
            "recipient_id": n.recipient_id,
            "message": n.message,
        }
        for n in created_notifications
    ]


def get_user_notifications(db: Session, recipient_id: str, recipient_type: str) -> Dict[str, Any]:
    """Retrieves notifications for a patient or doctor, newest first."""
    notifs = (
        db.query(models.Notification)
        .filter(models.Notification.recipient_id == recipient_id)
        .filter(models.Notification.recipient_type == recipient_type)
        .order_by(models.Notification.created_at.desc())
        .all()
    )
    unread_count = sum(1 for n in notifs if n.read_at is None)
    items = []
    for n in notifs:
        items.append({
            "id": n.id,
            "recipient_type": n.recipient_type,
            "report_id": n.report_id,
            "risk_flag_id": n.risk_flag_id,
            "message": n.message,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "is_read": n.read_at is not None,
        })
    return {"unread_count": unread_count, "notifications": items}


def mark_notification_as_read(db: Session, notification_id: str, recipient_id: str) -> Dict[str, Any]:
    """Marks a single notification as read."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.recipient_id != recipient_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this notification")

    if notif.read_at is None:
        notif.read_at = datetime.utcnow()
        db.commit()

    return {"id": notif.id, "status": "read"}


def mark_all_notifications_as_read(db: Session, recipient_id: str, recipient_type: str) -> Dict[str, Any]:
    """Marks all notifications as read for the user or doctor."""
    unread = (
        db.query(models.Notification)
        .filter(models.Notification.recipient_id == recipient_id)
        .filter(models.Notification.recipient_type == recipient_type)
        .filter(models.Notification.read_at == None)
        .all()
    )
    now = datetime.utcnow()
    for n in unread:
        n.read_at = now
    db.commit()
    return {"updated_count": len(unread)}
