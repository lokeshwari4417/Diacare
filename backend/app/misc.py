"""
Chat, report-PDF, and health routes.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from . import models, schemas, chat_service
from .database import get_db
from .auth import get_current_user
from .patients import _run_prediction
from .pdf_report import build_pdf

router = APIRouter(tags=["misc"])


@router.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    mode = "clinician" if user.role.value in ("doctor", "ngo") else "patient"

    risk_band = payload.risk_band or "Unknown"
    risk_score = f"{payload.risk_score * 100:.1f}%" if payload.risk_score is not None else "N/A"
    top_factors = ", ".join(payload.top_factors) if payload.top_factors else "N/A"
    report_summary = str(payload.report_data) if payload.report_data else "N/A"

    if payload.context_report_id:
        report = db.query(models.Report).filter(models.Report.id == payload.context_report_id).first()
        if report:
            risk_band = report.risk_band
            risk_score = f"{report.probability * 100:.1f}%"
            report_summary = f"Glucose: {report.glucose}, BMI: {report.bmi}, Age: {report.age}, Blood Pressure: {report.blood_pressure}"

    reply = chat_service.respond(
        message=payload.message,
        mode=mode,
        context_report_id=payload.context_report_id,
        risk_band=risk_band,
        risk_score=risk_score,
        top_factors=top_factors,
        report_summary=report_summary,
        language=payload.language or "English",
    )
    return schemas.ChatResponse(reply=reply)



@router.get("/reports/{report_id}/pdf")
def report_pdf(report_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if user.role == models.RoleEnum.patient and user.id != report.patient_id:
        raise HTTPException(status_code=403, detail="You can only download your own reports")

    patient = db.query(models.User).filter(models.User.id == report.patient_id).first()
    inputs = {
        "pregnancies": report.pregnancies, "glucose": report.glucose,
        "blood_pressure": report.blood_pressure, "skin_thickness": report.skin_thickness,
        "insulin": report.insulin, "bmi": report.bmi,
        "diabetes_pedigree_function": report.diabetes_pedigree_function, "age": report.age,
    }
    prediction = _run_prediction(inputs)

    pdf_bytes = build_pdf({
        "patient_name": patient.name if patient else "Patient",
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "inputs": inputs,
        "probability": report.probability,
        "risk_band": report.risk_band,
        "summary": prediction.summary,
        "top_factors": [f.model_dump() for f in prediction.shap_top_factors],
        "reference_comparison": [r.model_dump() for r in prediction.reference_comparison],
    })

    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=diacare_report_{report_id[:8]}.pdf"},
    )
