"""
Automated Test Suite for DiaCare Lab Report Analysis System (Phases 1 to 9).
Provides happy-path and regression testing using SQLAlchemy SQLite in-memory database.
"""
import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models

# Import Engines and Services from Phases 1 to 9
from app.lab_engine import interpret_result, evaluate_risk_flags, generate_recommendations
from app.lab_trends import get_test_trend, get_patient_lab_summary, get_risk_flag_history
from app.lab_pdf import generate_report_pdf, generate_summary_pdf
from app.lab_shares import create_share_link, get_public_shared_content, revoke_share_link
from app.lab_reference import get_test_reference_range
from app.lab_doctor_service import invite_doctor, respond_to_link, revoke_doctor_link, get_doctor_patient_portal_summary
from app.lab_notifications import check_and_notify_critical_flags, get_user_notifications
from app.lab_analytics import get_dashboard_summary
from app.lab_ocr_normalizer import normalize_extracted_row
from app.lab_audit import log_action, get_patient_audit_logs, check_rate_limit


@pytest.fixture(scope="module")
def db_session():
    """Sets up an isolated SQLite in-memory database session for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Create test patient and test doctor accounts
    patient = models.User(
        id="test_patient_1",
        name="John Doe",
        email="john.doe@example.com",
        hashed_password="hashed_pw_123",
        role=models.RoleEnum.patient,
        status="active",
    )
    doctor = models.DoctorAccount(
        id="test_doctor_1",
        name="Dr. Smith, MD",
        email="dr.smith@hospital.org",
        hashed_password="hashed_pw_456",
        license_number="MD-9999",
    )
    db.add(patient)
    db.add(doctor)
    db.commit()

    yield db

    db.close()


# ---------- Phase 1 Test: Submission & Interpretation ----------
def test_phase1_report_submission_and_interpretation(db_session):
    interp_glucose = interpret_result("Fasting Glucose", 140.0, "mg/dL")
    assert interp_glucose["status_enum"] == "high"
    assert interp_glucose["ref_low"] == 70.0
    assert interp_glucose["ref_high"] == 99.0
    assert "Fasting Glucose" in interp_glucose["test_name_normalized"]

    interp_hba1c = interpret_result("HbA1c", 7.0, "%")
    assert interp_hba1c["status_enum"] == "high"


# ---------- Phase 2 Test: Risk Flag Evaluation ----------
def test_phase2_risk_flag_evaluation():
    test_results = [
        {"id": "tr1", "test_name_normalized": "Fasting Glucose", "value_numeric": 140.0, "status_enum": "high"},
        {"id": "tr2", "test_name_normalized": "HbA1c", "value_numeric": 7.0, "status_enum": "high"},
    ]
    flags = evaluate_risk_flags(test_results)
    assert len(flags) > 0
    assert flags[0]["condition_name"] == "Pattern consistent with diabetes"
    assert flags[0]["likelihood_enum"] == "high"

    recs = generate_recommendations(flags, test_results)
    assert len(recs) > 0
    assert any(r["category"] == "diet" for r in recs)


# ---------- Phase 3 Test: Trend & History Retrieval ----------
def test_phase3_trend_and_history_retrieval(db_session):
    # Create test report & test results in DB
    report = models.LabReport(
        id="rep_phase3",
        patient_id="test_patient_1",
        lab_name="Central Lab",
        report_date="2026-08-01",
        status="completed",
    )
    tr = models.LabTestResult(
        id="tr_phase3",
        report_id=report.id,
        test_name_normalized="Fasting Glucose",
        value_numeric=140.0,
        value_text="140.0",
        unit="mg/dL",
        ref_low=70.0,
        ref_high=99.0,
        status_enum="high",
        category="Metabolic / Diabetes",
    )
    db_session.add(report)
    db_session.add(tr)
    db_session.commit()

    summary = get_patient_lab_summary(db_session, "test_patient_1")
    assert len(summary) > 0
    assert summary[0]["test_name_normalized"] == "Fasting Glucose"

    trend = get_test_trend(db_session, "test_patient_1", "Fasting Glucose")
    assert len(trend) > 0
    assert trend[0]["value_numeric"] == 140.0


# ---------- Phase 4 Test: PDF Export & Public Doctor Share Links ----------
def test_phase4_pdf_and_doctor_share_links(db_session):
    # PDF Generation
    pdf_buf = generate_report_pdf(db_session, "rep_phase3")
    assert pdf_buf is not None
    assert len(pdf_buf.getvalue()) > 0

    # Share link creation
    share = create_share_link(db_session, patient_id="test_patient_1", report_id="rep_phase3")
    token = share["share_token"]
    assert token is not None

    # Public content verification
    shared_content = get_public_shared_content(db_session, token)
    assert shared_content["type"] in ("single_report", "full_summary")
    assert ("report" in shared_content) or ("summary" in shared_content)


    # Revocation
    rev = revoke_share_link(db_session, token=token, user_id="test_patient_1")
    assert rev["status"] == "revoked"


    # Revoked link throws 410 Exception
    with pytest.raises(Exception):
        get_public_shared_content(db_session, token)



# ---------- Phase 5 Test & Regression: Demographic Ranges & Fallback ----------
def test_phase5_age_sex_adjusted_ranges_and_fallback():
    # Male variant
    male_ref = get_test_reference_range("Hemoglobin", sex="male")
    assert male_ref["ref_low"] == 13.5
    assert male_ref["ref_high"] == 17.5
    assert male_ref["is_demographic_adjusted"] is True

    # Female variant
    female_ref = get_test_reference_range("Hemoglobin", sex="female")
    assert female_ref["ref_low"] == 12.0
    assert female_ref["ref_high"] == 15.5
    assert female_ref["is_demographic_adjusted"] is True

    # REGRESSION TEST: Unprofiled fallback (no age/sex/pregnancy specified)
    default_ref = interpret_result("Hemoglobin", 11.5, "g/dL")
    assert default_ref["ref_low"] == 12.0
    assert default_ref["ref_high"] == 17.5
    assert default_ref["is_demographic_adjusted"] is False


# ---------- Phase 6 Test: Doctor Invite, Accept, Revoke & Data Access Boundary ----------
def test_phase6_doctor_invite_accept_revoke(db_session):
    # Invite doctor
    inv = invite_doctor(db_session, patient_id="test_patient_1", doctor_email="dr.smith@hospital.org")
    link_id = inv["link_id"]
    assert inv["status"] == "pending"

    # Accept link as doctor
    resp = respond_to_link(db_session, doctor_id="test_doctor_1", link_id=link_id, accept=True)
    assert resp["status"] == "accepted"

    # Access patient portal summary as accepted doctor
    portal_summary = get_doctor_patient_portal_summary(db_session, doctor_id="test_doctor_1", patient_id="test_patient_1")
    assert portal_summary["patient_name"] == "John Doe"

    # Revoke link as patient
    rev = revoke_doctor_link(db_session, patient_id="test_patient_1", link_id=link_id)
    assert rev["status"] == "revoked"

    # Data Boundary Exception test: Revoked link returns 403
    with pytest.raises(Exception):
        get_doctor_patient_portal_summary(db_session, doctor_id="test_doctor_1", patient_id="test_patient_1")


# ---------- Phase 7 Test: Critical Notification Creation ----------
def test_phase7_critical_notification_creation(db_session):
    # Re-accept doctor link for notifications test
    inv = invite_doctor(db_session, patient_id="test_patient_1", doctor_email="dr.smith@hospital.org")
    respond_to_link(db_session, doctor_id="test_doctor_1", link_id=inv["link_id"], accept=True)

    # Add a critical risk flag to rep_phase3
    rf = models.LabRiskFlag(
        id="rf_phase7",
        report_id="rep_phase3",
        condition_name="Pattern consistent with diabetes",
        likelihood_enum="high",
        rationale_text="Fasting glucose elevated >= 126 mg/dL",
    )
    db_session.add(rf)
    db_session.commit()

    # Trigger critical notification logic
    notifs = check_and_notify_critical_flags(db_session, "rep_phase3")
    assert len(notifs) >= 2  # Patient + Doctor notifications

    p_notifs = get_user_notifications(db_session, recipient_id="test_patient_1", recipient_type="patient")
    assert p_notifs["unread_count"] > 0


# ---------- Phase 8 Test: Dashboard Aggregation ----------
def test_phase8_dashboard_aggregation(db_session):
    dash = get_dashboard_summary(db_session, "test_patient_1")
    assert dash["patient_id"] == "test_patient_1"
    assert "Fasting Glucose" in dash["trend_series"]
    assert len(dash["recommended_focus_tests"]) > 0


# ---------- Phase 9 Test: OCR Normalization & HIPAA Audit Log Entry Creation ----------
def test_phase9_ocr_normalization_and_audit_logging(db_session):
    # OCR Normalization & Unit Conversion
    norm = normalize_extracted_row("fasting blood sugar", 7.0, "mmol/L", confidence=0.90)
    assert norm["canonical_name"] == "Fasting Glucose"
    assert norm["value"] == 126.1
    assert norm["unit"] == "mg/dL"
    assert norm["needs_review"] is True
    assert norm["review_reason"] == "Converted units"

    # Audit Logging
    log_action(db_session, actor_type="patient", actor_id="test_patient_1", action="view_report", target_type="report", target_id="rep_phase3")
    logs = get_patient_audit_logs(db_session, "test_patient_1")
    assert len(logs) > 0
    assert logs[0]["action"] == "view_report"

    # Rate Limiter test
    check_rate_limit("test_key_1", max_requests=10, window_seconds=60)
