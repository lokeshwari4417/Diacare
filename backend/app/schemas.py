"""
Pydantic schemas: request/response models with strict range validation
matching the Section 4 clinical input table.
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field, confloat, conint


# ---------- Auth ----------

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    password: str = Field(min_length=6)
    role: Literal["patient", "doctor", "ngo", "admin"]
    information: Optional[str] = None



class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str = Field(min_length=6)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    role: str
    information: Optional[str] = None
    is_active: bool
    status: str

    class Config:
        from_attributes = True



class UserUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    information: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Clinical inputs (Section 4) ----------

class ClinicalInput(BaseModel):
    pregnancies: conint(ge=0, le=17)
    glucose: confloat(ge=0, le=200)
    blood_pressure: confloat(ge=0, le=122)
    skin_thickness: confloat(ge=0, le=99)
    insulin: confloat(ge=0, le=846)
    bmi: confloat(ge=0, le=67)
    diabetes_pedigree_function: confloat(ge=0.08, le=2.42)
    age: conint(ge=21, le=81)


class PredictRequest(ClinicalInput):
    patient_id: Optional[str] = None  # doctor/NGO acting on behalf of a patient
    source: Literal["manual", "scan"] = "manual"


class ContributingFactor(BaseModel):
    feature: str
    direction: Literal["increases", "decreases"]
    magnitude: float
    value: float
    caption: str
    shap_value: float


class ReferenceRangeItem(BaseModel):
    feature: str
    value: float
    low: float
    high: float
    unit: str
    status: Literal["in_range", "borderline", "out_of_range"]
    source: str


class PredictResponse(BaseModel):
    probability: float
    risk_band: Literal["low", "moderate", "high"]
    summary: str
    disclaimer: str
    shap_top_factors: List[ContributingFactor]
    reference_comparison: List[ReferenceRangeItem]


class SimulateRequest(BaseModel):
    base: ClinicalInput
    modified_feature: Literal["glucose", "bmi", "blood_pressure"]
    modified_value: float


class SimulateResponse(BaseModel):
    probability: float
    risk_band: Literal["low", "moderate", "high"]
    delta_percentage_points: float


# ---------- Scan (mocked AI integration point) ----------

class ScanResponse(BaseModel):
    extracted: ClinicalInput
    confidence: float
    notice: str


# ---------- Chat (mocked AI integration point) ----------

class ChatRequest(BaseModel):
    message: str
    mode: Literal["patient", "clinician"] = "patient"
    context_report_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


# ---------- Reports / Patients ----------

class ReportCreate(ClinicalInput):
    patient_id: str
    source: Literal["manual", "scan"] = "manual"


class ReportOut(BaseModel):
    id: str
    patient_id: str
    created_by_id: str
    pregnancies: int
    glucose: float
    blood_pressure: float
    skin_thickness: float
    insulin: float
    bmi: float
    diabetes_pedigree_function: float
    age: int
    probability: float
    risk_band: str
    source: str
    status: str
    last_updated_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    status: Literal["draft", "submitted_by_ngo", "reviewed_by_doctor", "finalized"]


class PatientCreate(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    information: Optional[str] = None


class PatientOut(UserOut):
    report_count: int = 0
    latest_risk_band: Optional[str] = None


class AdminStats(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_ngo_workers: int
    total_screenings: int
    risk_band_distribution: dict


# ---------- OTP ----------

class SendOTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str


# ---------- Appointment ----------

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    date: str
    time: str


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    date: str
    time: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
