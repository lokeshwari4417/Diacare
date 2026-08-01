"""
Phase 8 Analytics Dashboard & Trend Aggregation Service.
Read-only visualization helper combining Phase 3 & 5 summary, trend series, and risk flag history.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from .lab_trends import get_patient_lab_summary, get_test_trend, get_risk_flag_history
from .lab_routes import get_patient_demographics
from . import models


def get_dashboard_summary(db: Session, patient_id: str) -> Dict[str, Any]:
    """
    Returns single aggregated payload containing:
      - patient demographics
      - latest summary for all tests
      - multi-test longitudinal trend series
      - historical risk flag timeline
      - recommended focus test list (auto-select default for UI chart)
    """
    patient = db.query(models.User).filter(models.User.id == patient_id).first()
    patient_name = patient.name if patient else "Patient"

    demographics = get_patient_demographics(db, patient_id)
    summary_list = get_patient_lab_summary(db, patient_id)
    risk_flags = get_risk_flag_history(db, patient_id)

    # Build trend series dictionary per test
    trend_series = {}
    recommended_focus = []

    for item in summary_list:
        test_name = item["test_name_normalized"]
        points = get_test_trend(db, patient_id, test_name, limit=20)
        trend_series[test_name] = points

        # Mark tests with abnormal latest status as recommended focus
        if item.get("latest_status") in ("high", "low", "borderline"):
            recommended_focus.append(test_name)

    # Also include tests tied to risk flags in recommended focus
    for rf in risk_flags:
        for tname in trend_series.keys():
            if tname not in recommended_focus:
                # If risk flag condition matches test name
                if any(w in rf.get("condition_name", "").lower() for w in tname.lower().split()):
                    recommended_focus.append(tname)

    # Fallback default focus test if none flagged
    if not recommended_focus and summary_list:
        recommended_focus.append(summary_list[0]["test_name_normalized"])

    return {
        "patient_id": patient_id,
        "patient_name": patient_name,
        "demographics": demographics,
        "summary": summary_list,
        "risk_flag_history": risk_flags,
        "trend_series": trend_series,
        "recommended_focus_tests": recommended_focus,
    }
