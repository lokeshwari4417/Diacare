"""
API Routes for Phase 1 Lab Report Analysis.
Endpoints:
  POST /v1/reports/manual  - Creates report, interprets tests, evaluates risk flags & recommendations
  GET  /v1/reports/{id}   - Retrieves full structured report
  GET  /v1/lab-tests/reference - Returns 20 canonical lab tests reference dictionary
"""
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user
from . import models
from .lab_reference import LAB_TEST_REFERENCE
from .lab_engine import interpret_result, evaluate_risk_flags, generate_recommendations

router = APIRouter(prefix="/v1", tags=["lab-reports"])


class SingleTestInput(BaseModel):
    test_name: str
    value: float
    unit: str


class ManualReportCreate(BaseModel):
    patient_id: Optional[str] = None
    lab_name: Optional[str] = "Diagnostic Laboratory"
    report_date: Optional[str] = None
    results: List[SingleTestInput]


@router.get("/lab-tests/reference")
def get_lab_reference():
    """Returns canonical reference range dictionary for frontend typeahead dropdown."""
    tests_list = []
    for key, data in LAB_TEST_REFERENCE.items():
        tests_list.append({
            "key": key,
            "canonical_name": data["canonical_name"],
            "unit": data["unit"],
            "category": data["category"],
            "ref_low": data["ref_low"],
            "ref_high": data["ref_high"],
        })
    return {"tests": tests_list}


@router.post("/reports/manual")
def create_manual_lab_report(
    payload: ManualReportCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Determine target patient ID
    target_patient_id = payload.patient_id or user.id

    # Create parent LabReport record
    report_date_str = payload.report_date or datetime.utcnow().strftime("%Y-%m-%d")
    report = models.LabReport(
        id=str(uuid.uuid4()),
        patient_id=target_patient_id,
        lab_name=payload.lab_name or "Diagnostic Laboratory",
        report_date=report_date_str,
        status="completed",
    )
    db.add(report)
    db.flush()

    processed_results = []
    
    # 1. Process each test result & interpretation
    for item in payload.results:
        interp = interpret_result(item.test_name, item.value, item.unit)
        test_res = models.LabTestResult(
            id=str(uuid.uuid4()),
            report_id=report.id,
            test_name_normalized=interp["test_name_normalized"],
            value_numeric=item.value,
            value_text=str(item.value),
            unit=item.unit,
            ref_low=interp["ref_low"],
            ref_high=interp["ref_high"],
            status_enum=interp["status_enum"],
            category=interp["category"],
        )
        db.add(test_res)
        db.flush()

        interpretation = models.LabInterpretation(
            id=str(uuid.uuid4()),
            test_result_id=test_res.id,
            plain_language_explanation=interp["plain_language_explanation"],
            possible_causes=interp["possible_causes"],
        )
        db.add(interpretation)

        processed_results.append({
            "id": test_res.id,
            "test_name_normalized": interp["test_name_normalized"],
            "value_numeric": item.value,
            "unit": item.unit,
            "status_enum": interp["status_enum"],
            "category": interp["category"],
        })

    # 2. Evaluate Tier 1 Risk Flags
    risk_flags_eval = evaluate_risk_flags(processed_results)
    for flag in risk_flags_eval:
        risk_flag_rec = models.LabRiskFlag(
            id=str(uuid.uuid4()),
            report_id=report.id,
            condition_name=flag["condition_name"],
            likelihood_enum=flag["likelihood_enum"],
            contributing_test_result_ids=flag["contributing_test_result_ids"],
            rationale_text=flag["rationale_text"],
        )
        db.add(risk_flag_rec)

    # 3. Generate Recommendations
    recommendations_eval = generate_recommendations(risk_flags_eval, processed_results)
    for rec in recommendations_eval:
        rec_record = models.LabRecommendation(
            id=str(uuid.uuid4()),
            report_id=report.id,
            category=rec["category"],
            text=rec["text"],
        )
        db.add(rec_record)

    db.commit()
    db.refresh(report)

    return {"report_id": report.id, "status": "completed"}


@router.get("/reports/{report_id}")
def get_lab_report(
    report_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Lab report not found")

    # Serialize structured report output
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
        "id": report.id,
        "patient_id": report.patient_id,
        "lab_name": report.lab_name,
        "report_date": report.report_date,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "test_results": test_results_out,
        "risk_flags": risk_flags_out,
        "recommendations": recommendations_out,
    }
