"""
Patient management + report routes: patient table, patient details/profile,
create-profile, report create/update/finalize with the NGO->Doctor status
pipeline (Section 3.2 / 3.3).
"""
import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from . import models, schemas, model_service, scan_service, reference_ranges
from .database import get_db
from .auth import get_current_user, require_roles
from .config import RISK_THRESHOLDS

router = APIRouter(tags=["patients"])


def _risk_band(probability: float) -> str:
    if probability < RISK_THRESHOLDS["low_max"]:
        return "low"
    if probability < RISK_THRESHOLDS["moderate_max"]:
        return "moderate"
    return "high"


def _top_factors(shap_values: dict, inputs: dict, n: int = 5) -> List[schemas.ContributingFactor]:
    labels = {
        "pregnancies": "Pregnancies", "glucose": "Glucose", "blood_pressure": "Blood Pressure",
        "skin_thickness": "Skin Thickness", "insulin": "Insulin", "bmi": "BMI",
        "diabetes_pedigree_function": "Diabetes Pedigree Function", "age": "Age",
    }
    ranked = sorted(shap_values.items(), key=lambda kv: abs(kv[1]), reverse=True)[:n]
    factors = []
    for feature, val in ranked:
        direction = "increases" if val >= 0 else "decreases"
        label = labels.get(feature, feature)
        value = inputs[feature]
        verb = "increases" if direction == "increases" else "decreases"
        caption = f"Your {label} of {value} {verb} your estimated risk."
        factors.append(schemas.ContributingFactor(
            feature=label, direction=direction, magnitude=abs(val), value=value,
            caption=caption, shap_value=val,
        ))
    return factors


def _summary_sentence(factors: List[schemas.ContributingFactor]) -> str:
    if not factors:
        return "Your result is based on a combination of the values you submitted."
    top = factors[0]
    verb = "is the top factor increasing" if top.direction == "increases" else "is the top factor decreasing"
    return f"{top.feature} {verb} your estimated risk."


def _run_prediction(inputs: dict) -> schemas.PredictResponse:
    from .config import DISCLAIMER_TEXT
    result = model_service.predict(inputs)
    band = _risk_band(result["probability"])
    factors = _top_factors(result["shap_values"], inputs)
    return schemas.PredictResponse(
        probability=result["probability"],
        risk_band=band,
        summary=_summary_sentence(factors),
        disclaimer=DISCLAIMER_TEXT,
        shap_top_factors=factors,
        reference_comparison=reference_ranges.build_reference_comparison(inputs),
    )


# ---------- Prediction / Simulation / Scan ----------

@router.post("/predict", response_model=schemas.PredictResponse)
def predict(payload: schemas.PredictRequest, user: models.User = Depends(get_current_user)):
    inputs = payload.model_dump(exclude={"patient_id", "source"})
    return _run_prediction(inputs)


@router.post("/simulate", response_model=schemas.SimulateResponse)
def simulate(payload: schemas.SimulateRequest, user: models.User = Depends(get_current_user)):
    base_inputs = payload.base.model_dump()
    base_prob = model_service.predict(base_inputs)["probability"]
    new_prob = model_service.simulate_single_feature(
        base_inputs, payload.modified_feature, payload.modified_value
    )
    return schemas.SimulateResponse(
        probability=new_prob,
        risk_band=_risk_band(new_prob),
        delta_percentage_points=round((new_prob - base_prob) * 100, 1),
    )


@router.post("/scan", response_model=schemas.ScanResponse)
async def scan(file: UploadFile = File(...), user: models.User = Depends(get_current_user)):
    image_bytes = await file.read()
    await asyncio.sleep(1.5)  # simulated OCR/processing delay
    result = scan_service.extract_from_image(image_bytes, file.filename or "upload")
    return schemas.ScanResponse(
        extracted=schemas.ClinicalInput(**result["extracted"]),
        confidence=result["confidence"],
        notice="Extracted values are a best-effort estimate -- please review and correct before submitting.",
    )


# ---------- Patient table / details (Doctor & NGO) ----------

@router.get("/patients", response_model=List[schemas.PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("doctor", "ngo", "admin")),
):
    patients = db.query(models.User).filter(models.User.role == models.RoleEnum.patient).all()
    out = []
    for p in patients:
        reports = sorted(p.reports, key=lambda r: r.created_at, reverse=True)
        out.append(schemas.PatientOut(
            **schemas.UserOut.model_validate(p).model_dump(),
            report_count=len(reports),
            latest_risk_band=reports[0].risk_band if reports else None,
        ))
    return out


@router.post("/patients", response_model=schemas.UserOut)
def create_patient(
    payload: schemas.PatientCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("doctor", "ngo", "admin")),
):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A patient with this email already exists")
    import uuid
    from .security import hash_password
    temp_password = hash_password(str(uuid.uuid4()))  # patient sets their own password later via reset flow
    patient = models.User(
        name=payload.name, email=payload.email, mobile=payload.mobile,
        information=payload.information, hashed_password=temp_password,
        role=models.RoleEnum.patient, managed_by_id=user.id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/patients/{patient_id}", response_model=schemas.UserOut)
def get_patient(
    patient_id: str, db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    patient = db.query(models.User).filter(models.User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if user.role == models.RoleEnum.patient and user.id != patient_id:
        raise HTTPException(status_code=403, detail="You can only view your own profile")
    return patient


@router.get("/patients/{patient_id}/reports", response_model=List[schemas.ReportOut])
def get_patient_reports(
    patient_id: str, db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.role == models.RoleEnum.patient and user.id != patient_id:
        raise HTTPException(status_code=403, detail="You can only view your own reports")
    reports = (
        db.query(models.Report)
        .filter(models.Report.patient_id == patient_id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    return reports


# ---------- Reports ----------

@router.post("/reports", response_model=schemas.ReportOut)
def create_report(
    payload: schemas.ReportCreate, db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.role == models.RoleEnum.patient and user.id != payload.patient_id:
        raise HTTPException(status_code=403, detail="Patients may only submit their own reports")

    patient = db.query(models.User).filter(models.User.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    inputs = payload.model_dump(exclude={"patient_id", "source"})
    prediction = _run_prediction(inputs)

    initial_status = models.ReportStatus.draft
    if user.role == models.RoleEnum.ngo:
        initial_status = models.ReportStatus.submitted_by_ngo
    elif user.role in (models.RoleEnum.doctor,):
        initial_status = models.ReportStatus.reviewed_by_doctor

    report = models.Report(
        patient_id=payload.patient_id, created_by_id=user.id,
        **inputs,
        probability=prediction.probability, risk_band=prediction.risk_band,
        source=payload.source, status=initial_status, last_updated_by_id=user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if user.role == models.RoleEnum.patient and user.id != report.patient_id:
        raise HTTPException(status_code=403, detail="You can only view your own reports")
    return report


@router.patch("/reports/{report_id}/status", response_model=schemas.ReportOut)
def update_report_status(
    report_id: str, payload: schemas.ReportStatusUpdate, db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("doctor", "ngo")),
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # NGOs can only submit; only doctors can review/finalize (Section 3.3)
    if user.role == models.RoleEnum.ngo and payload.status not in ("draft", "submitted_by_ngo"):
        raise HTTPException(status_code=403, detail="NGO workers cannot finalize or countersign reports")

    report.status = models.ReportStatus(payload.status)
    report.last_updated_by_id = user.id
    db.commit()
    db.refresh(report)
    return report


@router.patch("/reports/{report_id}", response_model=schemas.ReportOut)
def update_report_values(
    report_id: str, payload: schemas.ClinicalInput, db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("doctor", "ngo")),
):
    """Doctor/NGO correcting or annotating a result before finalizing --
    changes are logged with a timestamp and the acting user's id (audit trail)."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    inputs = payload.model_dump()
    for key, value in inputs.items():
        setattr(report, key, value)

    prediction = _run_prediction(inputs)
    report.probability = prediction.probability
    report.risk_band = prediction.risk_band
    report.last_updated_by_id = user.id
    if user.role == models.RoleEnum.doctor and report.status != models.ReportStatus.finalized:
        report.status = models.ReportStatus.reviewed_by_doctor

    db.commit()
    db.refresh(report)
    return report
