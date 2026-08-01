"""
Phase 6 Doctor-Patient Link & Clinical Notes Service.
Reuses Phase 3 & Phase 5 summary/trend functions for doctor read-only access.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from . import models
from .lab_trends import get_patient_lab_summary, get_risk_flag_history, get_patient_reports_list
from .lab_routes import get_patient_demographics


def auto_link_pending_invites(db: Session, doctor: models.DoctorAccount):
    """Auto-attaches any pending patient invites matching the doctor's email."""
    pending_links = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.doctor_email == doctor.email.lower().strip())
        .filter(models.DoctorPatientLink.doctor_id == None)
        .all()
    )
    for link in pending_links:
        link.doctor_id = doctor.id
    db.commit()


def invite_doctor(db: Session, patient_id: str, doctor_email: str) -> Dict[str, Any]:
    """Patient invites doctor by email."""
    clean_email = doctor_email.lower().strip()
    
    # Check if link already exists
    existing = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.patient_id == patient_id)
        .filter(models.DoctorPatientLink.doctor_email == clean_email)
        .filter(models.DoctorPatientLink.status.in_(["pending", "accepted"]))
        .first()
    )
    if existing:
        return {
            "link_id": existing.id,
            "status": existing.status,
            "message": f"Link with {clean_email} is already {existing.status}.",
        }

    # Check if doctor account exists
    doc = db.query(models.DoctorAccount).filter(models.DoctorAccount.email == clean_email).first()

    link = models.DoctorPatientLink(
        patient_id=patient_id,
        doctor_email=clean_email,
        doctor_id=doc.id if doc else None,
        status="pending",
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return {
        "link_id": link.id,
        "doctor_email": clean_email,
        "status": "pending",
        "message": f"Invitation sent to {clean_email}.",
    }


def respond_to_link(db: Session, doctor_id: str, link_id: str, accept: bool) -> Dict[str, Any]:
    """Doctor accepts or declines a pending invite."""
    link = db.query(models.DoctorPatientLink).filter(models.DoctorPatientLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Invitation link not found")
    if link.doctor_id != doctor_id and link.doctor_email != db.query(models.DoctorAccount).get(doctor_id).email:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this invite")

    if accept:
        link.status = "accepted"
        link.accepted_at = datetime.utcnow()
        link.doctor_id = doctor_id
    else:
        link.status = "declined"

    db.commit()
    return {"link_id": link.id, "status": link.status}


def revoke_doctor_link(db: Session, patient_id: str, link_id: str) -> Dict[str, Any]:
    """Patient revokes an invitation or accepted link."""
    link = db.query(models.DoctorPatientLink).filter(models.DoctorPatientLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Doctor link not found")
    if link.patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this link")

    link.status = "revoked"
    db.commit()
    return {"link_id": link.id, "status": "revoked"}


def get_patient_doctor_links(db: Session, patient_id: str) -> List[Dict[str, Any]]:
    """Returns patient's active/pending doctor links."""
    links = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.patient_id == patient_id)
        .filter(models.DoctorPatientLink.status != "revoked")
        .all()
    )
    result = []
    for l in links:
        doc_name = l.doctor.name if l.doctor else "Doctor (Unregistered)"
        result.append({
            "link_id": l.id,
            "doctor_email": l.doctor_email,
            "doctor_name": doc_name,
            "status": l.status,
            "invited_at": l.invited_at.isoformat() if l.invited_at else None,
            "accepted_at": l.accepted_at.isoformat() if l.accepted_at else None,
        })
    return result


def get_doctor_links(db: Session, doctor: models.DoctorAccount) -> Dict[str, Any]:
    """Returns doctor's pending and accepted invites."""
    links = (
        db.query(models.DoctorPatientLink)
        .filter(
            (models.DoctorPatientLink.doctor_id == doctor.id) |
            (models.DoctorPatientLink.doctor_email == doctor.email)
        )
        .filter(models.DoctorPatientLink.status.in_(["pending", "accepted"]))
        .all()
    )
    pending = []
    accepted = []
    for l in links:
        patient_name = l.patient.name if l.patient else l.patient_id
        item = {
            "link_id": l.id,
            "patient_id": l.patient_id,
            "patient_name": patient_name,
            "patient_email": l.patient.email if l.patient else "",
            "invited_at": l.invited_at.isoformat() if l.invited_at else None,
            "accepted_at": l.accepted_at.isoformat() if l.accepted_at else None,
            "status": l.status,
        }
        if l.status == "pending":
            pending.append(item)
        elif l.status == "accepted":
            accepted.append(item)

    return {"pending_invites": pending, "accepted_patients": accepted}


def get_doctor_patient_portal_summary(db: Session, doctor_id: str, patient_id: str) -> Dict[str, Any]:
    """
    Doctor's read-only portal view for a linked patient.
    Verifies accepted link exists, then reuses Phase 3 & 5 engines.
    """
    doc = db.query(models.DoctorAccount).get(doctor_id)
    link = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.patient_id == patient_id)
        .filter(
            (models.DoctorPatientLink.doctor_id == doctor_id) |
            (models.DoctorPatientLink.doctor_email == doc.email)
        )
        .filter(models.DoctorPatientLink.status == "accepted")
        .first()
    )
    if not link:
        raise HTTPException(status_code=403, detail="Doctor access forbidden. Patient link is not accepted.")

    patient = db.query(models.User).get(patient_id)
    demographics = get_patient_demographics(db, patient_id)
    summary = get_patient_lab_summary(db, patient_id)
    risk_history = get_risk_flag_history(db, patient_id)
    reports = get_patient_reports_list(db, patient_id, skip=0, limit=20)
    notes = get_notes_for_patient(db, patient_id)

    return {
        "patient_id": patient_id,
        "patient_name": patient.name if patient else "Patient",
        "patient_email": patient.email if patient else "",
        "demographics": demographics,
        "summary": summary,
        "risk_flag_history": risk_history,
        "reports": reports,
        "doctor_notes": notes,
    }


def add_doctor_note(db: Session, doctor_id: str, patient_id: str, note_text: str, report_id: Optional[str] = None) -> Dict[str, Any]:
    """Adds a clinical note for a patient by linked doctor."""
    doc = db.query(models.DoctorAccount).get(doctor_id)
    link = (
        db.query(models.DoctorPatientLink)
        .filter(models.DoctorPatientLink.patient_id == patient_id)
        .filter(
            (models.DoctorPatientLink.doctor_id == doctor_id) |
            (models.DoctorPatientLink.doctor_email == doc.email)
        )
        .filter(models.DoctorPatientLink.status == "accepted")
        .first()
    )
    if not link:
        raise HTTPException(status_code=403, detail="Cannot add notes. Patient link is not accepted.")

    note = models.DoctorNote(
        doctor_id=doctor_id,
        patient_id=patient_id,
        report_id=report_id,
        note_text=note_text.strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "doctor_name": doc.name if doc else "Doctor",
        "note_text": note.note_text,
        "created_at": note.created_at.isoformat(),
    }


def get_notes_for_patient(db: Session, patient_id: str) -> List[Dict[str, Any]]:
    """Returns all doctor notes visible to patient and linked doctors."""
    notes = (
        db.query(models.DoctorNote)
        .filter(models.DoctorNote.patient_id == patient_id)
        .order_by(models.DoctorNote.created_at.desc())
        .all()
    )
    res = []
    for n in notes:
        res.append({
            "id": n.id,
            "doctor_id": n.doctor_id,
            "doctor_name": n.doctor.name if n.doctor else "Doctor",
            "note_text": n.note_text,
            "report_id": n.report_id,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    return res
