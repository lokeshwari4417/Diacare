"""
API Routes for Phase 1 & Phase 2 Lab Report Analysis.
Endpoints:
  POST /v1/reports/manual  - Creates report, interprets tests, evaluates risk flags & recommendations
  POST /v1/reports/upload  - Uploads image/PDF, performs OCR + name matching, returns DRAFT review payload
  POST /v1/reports/{id}/confirm - Confirms user-reviewed draft rows, executes Phase 1 pipeline, saves final report
  GET  /v1/reports/{id}   - Retrieves full structured report
  GET  /v1/lab-tests/reference - Returns 20 canonical lab tests reference dictionary
"""
import os
import uuid
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import get_db
from .auth import get_current_user
from . import models
from .lab_reference import LAB_TEST_REFERENCE
from .lab_engine import interpret_result, evaluate_risk_flags, generate_recommendations
from .lab_ocr import extract_lab_data_from_file, match_test_name
from .lab_trends import (
    get_patient_lab_summary, get_test_trend, get_risk_flag_history, get_patient_reports_list
)

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
    target_patient_id = payload.patient_id or user.id
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


@router.post("/reports/upload")
def upload_lab_report(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    lab_name: Optional[str] = Form("Diagnostic Laboratory"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Phase 2: Accepts Image/PDF, runs OCR extraction & fuzzy name matching,
    stores raw draft record with status='pending_review' WITHOUT saving test_results yet.
    """
    target_patient_id = patient_id or user.id
    report_id = str(uuid.uuid4())

    # Create storage path: uploads/lab_reports/{patient_id}/{report_id}/
    upload_dir = os.path.join("uploads", "lab_reports", target_patient_id, report_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    source_type = "pdf" if file.filename.lower().endswith(".pdf") else "image"

    # Save pending review report record
    report = models.LabReport(
        id=report_id,
        patient_id=target_patient_id,
        lab_name=lab_name or "Diagnostic Laboratory",
        report_date=datetime.utcnow().strftime("%Y-%m-%d"),
        status="pending_review",
        source_file_path=file_path,
        source_type=source_type,
    )
    db.add(report)
    db.commit()

    # Perform OCR Extraction
    ocr_res = extract_lab_data_from_file(file_path, source_type=source_type)
    extracted_rows = []
    for item in ocr_res.get("extracted_results", []):
        raw_name = item.get("test_name_raw", "")
        match_info = match_test_name(raw_name)
        extracted_rows.append({
            "test_name_raw": raw_name,
            "test_name_matched": match_info["canonical_name"],
            "is_matched": match_info["is_matched"],
            "value": item.get("value"),
            "unit": item.get("unit") or match_info["unit"],
            "reference_range_raw": item.get("reference_range_raw", ""),
        })

    return {
        "report_id": report.id,
        "status": "pending_review",
        "lab_name": report.lab_name,
        "extracted_rows": extracted_rows,
        "raw_ocr_text": ocr_res.get("raw_ocr_text", ""),
    }


@router.post("/reports/{report_id}/confirm")
def confirm_lab_report(
    report_id: str,
    payload: ManualReportCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Phase 2 Human-Review Confirmation:
    Accepts user-reviewed test rows, runs Phase 1 interpretation, risk evaluation,
    and recommendation engines, then saves everything to DB and marks status='completed'.
    """
    report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Lab report not found")

    # Clear old test results if any exist
    db.query(models.LabTestResult).filter(models.LabTestResult.report_id == report.id).delete()
    db.query(models.LabRiskFlag).filter(models.LabRiskFlag.report_id == report.id).delete()
    db.query(models.LabRecommendation).filter(models.LabRecommendation.report_id == report.id).delete()
    db.flush()

    processed_results = []
    
    # Run exact Phase 1 pipeline
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

    # Evaluate Tier 1 Risk Flags & Recommendations
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

    recommendations_eval = generate_recommendations(risk_flags_eval, processed_results)
    for rec in recommendations_eval:
        rec_record = models.LabRecommendation(
            id=str(uuid.uuid4()),
            report_id=report.id,
            category=rec["category"],
            text=rec["text"],
        )
        db.add(rec_record)

    report.status = "completed"
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
        "source_file_path": report.source_file_path,
        "source_type": report.source_type,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "test_results": test_results_out,
        "risk_flags": risk_flags_out,
        "recommendations": recommendations_out,
    }


# ---------- Phase 3: Patient Lab Trends & History Endpoints ----------

@router.get("/patients/{patient_id}/lab-summary")
def get_patient_lab_summary_endpoint(
    patient_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Returns latest value, status, and trend direction per test across all patient reports.
    """
    summary = get_patient_lab_summary(db, patient_id)
    return {"patient_id": patient_id, "summary": summary}


@router.get("/patients/{patient_id}/lab-trend/{test_name}")
def get_patient_test_trend_endpoint(
    patient_id: str,
    test_name: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Returns historical time series points for a specific normalized test name.
    """
    points = get_test_trend(db, patient_id, test_name, limit=limit)
    return {"patient_id": patient_id, "test_name": test_name, "points": points}


@router.get("/patients/{patient_id}/risk-flag-history")
def get_patient_risk_flag_history_endpoint(
    patient_id: str,
    condition: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Returns chronological timeline of all risk flags raised for the patient.
    """
    history = get_risk_flag_history(db, patient_id, condition_name=condition)
    return {"patient_id": patient_id, "risk_flags": history}


@router.get("/patients/{patient_id}/reports")
def get_patient_reports_endpoint(
    patient_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Returns paginated list of all past lab reports for the patient.
    """
    return get_patient_reports_list(db, patient_id, skip=skip, limit=limit)

