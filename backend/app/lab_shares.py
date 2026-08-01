"""
Phase 4 Share Link Generation, Revocation, and Public Resolution Engine.
Handles secure token generation for doctor sharing.
"""
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from . import models
from .lab_trends import get_patient_lab_summary, get_risk_flag_history


def create_share_link(db: Session, patient_id: str, report_id: Optional[str] = None, expires_in_days: int = 7) -> Dict[str, Any]:
    """
    Creates a new report_shares record with a secure random token and expiry date.
    If report_id is None, creates a share link for the patient's full summary.
    """
    token = secrets.token_urlsafe(24)
    expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

    share = models.LabReportShare(
        patient_id=patient_id,
        report_id=report_id,
        share_token=token,
        expires_at=expires_at,
        revoked=False,
    )
    db.add(share)
    db.commit()

    return {
        "share_token": token,
        "share_url": f"/shared/{token}",
        "expires_at": expires_at.isoformat(),
        "is_summary": report_id is None,
        "report_id": report_id,
    }


def revoke_share_link(db: Session, token: str, user_id: str) -> Dict[str, Any]:
    """
    Revokes an active share link if owned by user_id.
    """
    share = db.query(models.LabReportShare).filter(models.LabReportShare.share_token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    if share.patient_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this share link")

    share.revoked = True
    db.commit()
    return {"status": "revoked", "share_token": token}


def get_active_share_for_resource(db: Session, patient_id: str, report_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Checks if an unexpired, unrevoked share link already exists for a report/summary.
    """
    query = (
        db.query(models.LabReportShare)
        .filter(models.LabReportShare.patient_id == patient_id)
        .filter(models.LabReportShare.revoked == False)
        .filter(models.LabReportShare.expires_at > datetime.utcnow())
    )
    if report_id:
        query = query.filter(models.LabReportShare.report_id == report_id)
    else:
        query = query.filter(models.LabReportShare.report_id == None)

    existing = query.order_by(models.LabReportShare.created_at.desc()).first()
    if existing:
        return {
            "share_token": existing.share_token,
            "share_url": f"/shared/{existing.share_token}",
            "expires_at": existing.expires_at.isoformat(),
        }
    return None


def get_public_shared_content(db: Session, token: str) -> Dict[str, Any]:
    """
    PUBLIC endpoint logic. Validates share_token (must be unrevoked & unexpired)
    and returns read-only payload.
    """
    share = db.query(models.LabReportShare).filter(models.LabReportShare.share_token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Shared link not found or invalid.")

    if share.revoked:
        raise HTTPException(status_code=410, detail="This shared medical link has been revoked by the patient.")

    if share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This shared medical link has expired.")

    patient = db.query(models.User).filter(models.User.id == share.patient_id).first()
    patient_name = patient.name if patient else "Patient"

    if share.report_id:
        # Return single report content
        report = db.query(models.LabReport).filter(models.LabReport.id == share.report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Shared report content no longer exists.")

        test_results_out = []
        for tr in report.test_results:
            interp_data = None
            if tr.interpretation:
                interp_data = {
                    "plain_language_explanation": tr.interpretation.plain_language_explanation,
                    "possible_causes": tr.interpretation.possible_causes or [],
                }
            test_results_out.append({
                "id": tr.id,
                "test_name_normalized": tr.test_name_normalized,
                "value_numeric": tr.value_numeric,
                "value_text": tr.value_text,
                "unit": tr.unit,
                "ref_low": tr.ref_low,
                "ref_high": tr.ref_high,
                "status_enum": tr.status_enum,
                "category": tr.category,
                "interpretation": interp_data,
            })

        risk_flags_out = [
            {
                "id": rf.id,
                "condition_name": rf.condition_name,
                "likelihood_enum": rf.likelihood_enum,
                "contributing_test_result_ids": rf.contributing_test_result_ids or [],
                "rationale_text": rf.rationale_text,
            }
            for rf in report.risk_flags
        ]

        recommendations_out = [
            {
                "id": rc.id,
                "category": rc.category,
                "text": rc.text,
            }
            for rc in report.recommendations
        ]

        return {
            "type": "single_report",
            "patient_name": patient_name,
            "expires_at": share.expires_at.isoformat(),
            "report": {
                "id": report.id,
                "lab_name": report.lab_name,
                "report_date": report.report_date,
                "status": report.status,
                "created_at": report.created_at.isoformat() if report.created_at else None,
                "test_results": test_results_out,
                "risk_flags": risk_flags_out,
                "recommendations": recommendations_out,
            }
        }
    else:
        # Return full summary content
        summary = get_patient_lab_summary(db, share.patient_id)
        risk_history = get_risk_flag_history(db, share.patient_id)

        return {
            "type": "full_summary",
            "patient_name": patient_name,
            "expires_at": share.expires_at.isoformat(),
            "summary": summary,
            "risk_flag_history": risk_history,
        }
