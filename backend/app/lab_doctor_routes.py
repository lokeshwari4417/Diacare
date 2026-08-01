"""
Phase 6 API Routes for Doctor Portal & Patient-Doctor Account Linking.
Endpoints for doctor registration/login, invites, link approvals, portal views, and clinical notes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user
from . import models
from .lab_doctor_auth import (
    get_password_hash, verify_password, create_doctor_access_token, get_current_doctor
)
from .lab_doctor_service import (
    invite_doctor, auto_link_pending_invites, respond_to_link, revoke_doctor_link,
    get_patient_doctor_links, get_doctor_links, get_doctor_patient_portal_summary,
    add_doctor_note, get_notes_for_patient
)

router = APIRouter(prefix="/v1", tags=["doctor-portal"])


# Schemas
class DoctorRegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    license_number: Optional[str] = None


class DoctorLoginInput(BaseModel):
    email: EmailStr
    password: str


class DoctorInviteInput(BaseModel):
    doctor_email: EmailStr


class DoctorLinkRespondInput(BaseModel):
    accept: bool


class DoctorNoteInput(BaseModel):
    note_text: str
    report_id: Optional[str] = None


# Doctor Auth Endpoints
@router.post("/doctors/register")
def doctor_register(payload: DoctorRegisterInput, db: Session = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    existing = db.query(models.DoctorAccount).filter(models.DoctorAccount.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A doctor account with this email already exists.")

    doctor = models.DoctorAccount(
        name=payload.name.strip(),
        email=clean_email,
        hashed_password=get_password_hash(payload.password),
        license_number=payload.license_number,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    # Auto link any pending invites matching doctor email
    auto_link_pending_invites(db, doctor)

    token = create_doctor_access_token({"sub": doctor.id, "email": doctor.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "doctor": {
            "id": doctor.id,
            "name": doctor.name,
            "email": doctor.email,
            "license_number": doctor.license_number,
        }
    }


@router.post("/doctors/login")
def doctor_login(payload: DoctorLoginInput, db: Session = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    doctor = db.query(models.DoctorAccount).filter(models.DoctorAccount.email == clean_email).first()
    if not doctor or not verify_password(payload.password, doctor.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid doctor email or password.")

    # Auto link any pending invites matching doctor email
    auto_link_pending_invites(db, doctor)

    token = create_doctor_access_token({"sub": doctor.id, "email": doctor.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "doctor": {
            "id": doctor.id,
            "name": doctor.name,
            "email": doctor.email,
            "license_number": doctor.license_number,
        }
    }


@router.get("/doctors/me")
def get_doctor_me(doctor: models.DoctorAccount = Depends(get_current_doctor)):
    return {
        "id": doctor.id,
        "name": doctor.name,
        "email": doctor.email,
        "license_number": doctor.license_number,
    }


# Patient Doctor Link Endpoints
@router.post("/patients/{patient_id}/invite-doctor")
def invite_doctor_endpoint(
    patient_id: str,
    payload: DoctorInviteInput,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if patient_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return invite_doctor(db, patient_id=patient_id, doctor_email=payload.doctor_email)


@router.get("/patients/{patient_id}/doctor-links")
def get_patient_doctor_links_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if patient_id != user.id and user.role.value not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"patient_id": patient_id, "doctor_links": get_patient_doctor_links(db, patient_id)}


@router.post("/patients/{patient_id}/doctor-links/{link_id}/revoke")
def revoke_doctor_link_endpoint(
    patient_id: str,
    link_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if patient_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return revoke_doctor_link(db, patient_id=patient_id, link_id=link_id)


# Doctor Portal Endpoints
@router.get("/doctors/me/links")
def get_doctor_links_endpoint(
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    return get_doctor_links(db, doctor)


@router.post("/doctors/links/{link_id}/respond")
def respond_to_link_endpoint(
    link_id: str,
    payload: DoctorLinkRespondInput,
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    return respond_to_link(db, doctor_id=doctor.id, link_id=link_id, accept=payload.accept)


@router.get("/doctors/me/patients")
def get_doctor_patients_endpoint(
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    res = get_doctor_links(db, doctor)
    return {"patients": res.get("accepted_patients", [])}


@router.get("/doctors/patients/{patient_id}/summary")
def get_doctor_patient_summary_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    return get_doctor_patient_portal_summary(db, doctor_id=doctor.id, patient_id=patient_id)


@router.post("/doctors/patients/{patient_id}/notes")
def add_doctor_note_endpoint(
    patient_id: str,
    payload: DoctorNoteInput,
    db: Session = Depends(get_db),
    doctor: models.DoctorAccount = Depends(get_current_doctor),
):
    return add_doctor_note(
        db, doctor_id=doctor.id, patient_id=patient_id,
        note_text=payload.note_text, report_id=payload.report_id
    )


@router.get("/patients/{patient_id}/doctor-notes")
def get_patient_doctor_notes_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return {"patient_id": patient_id, "notes": get_notes_for_patient(db, patient_id)}
