"""
Phase 3 Trend Query Engine, Patient Summary Engine, and Risk Flag History Engine.
Performs read-only aggregations across existing Phase 1 & Phase 2 lab tables.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models


def get_test_trend(db: Session, patient_id: str, test_name_normalized: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Queries all test_results for patient + normalized test name ordered by report_date ascending.
    """
    query = (
        db.query(models.LabTestResult, models.LabReport)
        .join(models.LabReport, models.LabTestResult.report_id == models.LabReport.id)
        .filter(models.LabReport.patient_id == patient_id)
        .filter(func.lower(models.LabTestResult.test_name_normalized) == test_name_normalized.lower().strip())
        .order_by(models.LabReport.report_date.asc(), models.LabReport.created_at.asc())
        .limit(limit)
        .all()
    )

    points = []
    for tr, rep in query:
        points.append({
            "report_id": rep.id,
            "report_date": rep.report_date,
            "lab_name": rep.lab_name,
            "value_numeric": tr.value_numeric,
            "unit": tr.unit,
            "status_enum": tr.status_enum,
            "ref_low": tr.ref_low,
            "ref_high": tr.ref_high,
            "category": tr.category,
        })
    return points


def get_patient_lab_summary(db: Session, patient_id: str) -> List[Dict[str, Any]]:
    """
    Returns latest recorded value + status for every distinct test patient has had,
    along with trend direction ('improving', 'worsening', 'stable', 'insufficient_data').
    """
    reports = (
        db.query(models.LabReport)
        .filter(models.LabReport.patient_id == patient_id)
        .order_by(models.LabReport.report_date.asc(), models.LabReport.created_at.asc())
        .all()
    )

    if not reports:
        return []

    history_map: Dict[str, List[Dict[str, Any]]] = {}

    for rep in reports:
        for tr in rep.test_results:
            key = tr.test_name_normalized
            if key not in history_map:
                history_map[key] = []
            history_map[key].append({
                "report_id": rep.id,
                "report_date": rep.report_date,
                "value_numeric": tr.value_numeric,
                "unit": tr.unit,
                "status_enum": tr.status_enum,
                "ref_low": tr.ref_low,
                "ref_high": tr.ref_high,
                "category": tr.category,
            })

    summary_list = []
    for test_name, pts in history_map.items():
        latest = pts[-1]
        direction = "insufficient_data"

        if len(pts) >= 2:
            prev = pts[-2]
            v_curr = latest["value_numeric"]
            v_prev = prev["value_numeric"]
            ref_low = latest["ref_low"]
            ref_high = latest["ref_high"]

            if v_curr is not None and v_prev is not None and ref_low is not None and ref_high is not None:
                target_mid = (ref_low + ref_high) / 2.0
                dist_curr = abs(v_curr - target_mid)
                dist_prev = abs(v_prev - target_mid)

                rel_change = abs(v_curr - v_prev) / (v_prev if v_prev != 0 else 1.0)

                if rel_change <= 0.05:
                    direction = "stable"
                elif dist_curr < dist_prev:
                    direction = "improving"
                else:
                    direction = "worsening"
            else:
                direction = "stable"

        summary_list.append({
            "test_name_normalized": test_name,
            "category": latest["category"],
            "unit": latest["unit"],
            "latest_value": latest["value_numeric"],
            "latest_status": latest["status_enum"],
            "latest_date": latest["report_date"],
            "latest_report_id": latest["report_id"],
            "ref_low": latest["ref_low"],
            "ref_high": latest["ref_high"],
            "direction": direction,
            "total_records": len(pts),
        })

    return summary_list


def get_risk_flag_history(db: Session, patient_id: str, condition_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns all risk flags ever raised for a patient ordered by report date.
    """
    query = (
        db.query(models.LabRiskFlag, models.LabReport)
        .join(models.LabReport, models.LabRiskFlag.report_id == models.LabReport.id)
        .filter(models.LabReport.patient_id == patient_id)
    )

    if condition_name:
        query = query.filter(func.lower(models.LabRiskFlag.condition_name) == condition_name.lower().strip())

    query = query.order_by(models.LabReport.report_date.asc(), models.LabReport.created_at.asc()).all()

    history = []
    for rf, rep in query:
        history.append({
            "risk_flag_id": rf.id,
            "report_id": rep.id,
            "report_date": rep.report_date,
            "lab_name": rep.lab_name,
            "condition_name": rf.condition_name,
            "likelihood_enum": rf.likelihood_enum,
            "rationale_text": rf.rationale_text,
            "contributing_test_result_ids": rf.contributing_test_result_ids or [],
        })
    return history


def get_patient_reports_list(db: Session, patient_id: str, skip: int = 0, limit: int = 20) -> Dict[str, Any]:
    """
    Returns paginated list of all past lab reports for a patient with abnormal results count.
    """
    total = db.query(models.LabReport).filter(models.LabReport.patient_id == patient_id).count()
    reports = (
        db.query(models.LabReport)
        .filter(models.LabReport.patient_id == patient_id)
        .order_by(models.LabReport.report_date.desc(), models.LabReport.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = []
    for r in reports:
        abnormal_count = sum(1 for tr in r.test_results if tr.status_enum in ("high", "low", "borderline"))
        items.append({
            "id": r.id,
            "report_date": r.report_date,
            "lab_name": r.lab_name,
            "status": r.status,
            "total_tests": len(r.test_results),
            "abnormal_count": abnormal_count,
            "risk_flags_count": len(r.risk_flags),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "total": total,
        "items": items,
        "skip": skip,
        "limit": limit,
    }
