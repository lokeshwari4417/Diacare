"""
Phase 9 Part A: OCR Normalizer & Unit Conversion Engine.
Normalizes variant lab test names, converts units to canonical standards, and flags low-confidence items for human review.
"""
from typing import Dict, Any, Optional

# Data-driven Alias Mapping
TEST_NAME_ALIASES = {
    "hb": "Hemoglobin",
    "hgb": "Hemoglobin",
    "haemoglobin": "Hemoglobin",
    "hemoglobin count": "Hemoglobin",
    "fbs": "Fasting Glucose",
    "fasting blood sugar": "Fasting Glucose",
    "fasting plasma glucose": "Fasting Glucose",
    "fast glucose": "Fasting Glucose",
    "glucose": "Fasting Glucose",
    "serum creatinine": "Creatinine",
    "creat": "Creatinine",
    "s. creatinine": "Creatinine",
    "gfr": "eGFR",
    "egfr": "eGFR",
    "estimated gfr": "eGFR",
    "a1c": "HbA1c",
    "hba1c": "HbA1c",
    "glycated hb": "HbA1c",
    "glycated hemoglobin": "HbA1c",
    "alt": "ALT (SGPT)",
    "sgpt": "ALT (SGPT)",
    "alanine aminotransferase": "ALT (SGPT)",
    "ast": "AST (SGOT)",
    "sgot": "AST (SGOT)",
    "aspartate aminotransferase": "AST (SGOT)",
    "ggt": "GGT",
    "gamma gt": "GGT",
    "gamma glutamyl transferase": "GGT",
    "k": "Potassium",
    "k+": "Potassium",
    "potassium": "Potassium",
    "na": "Sodium",
    "na+": "Sodium",
    "sodium": "Sodium",
    "wbc": "WBC",
    "white blood cells": "WBC",
    "rbc": "RBC",
    "red blood cells": "RBC",
    "plt": "Platelets",
    "platelet count": "Platelets",
}

# Unit Conversion Rules to Standardize to Primary Reference Units
# Format: (test_canonical_key, source_unit_clean): conversion_lambda
UNIT_CONVERSIONS = {
    ("fasting glucose", "mmol/l"): lambda v: (round(v * 18.0182, 1), "mg/dL"),
    ("hba1c", "mmol/mol"): lambda v: (round((v / 10.929) + 2.15, 1), "%"),
    ("total cholesterol", "mmol/l"): lambda v: (round(v * 38.67, 1), "mg/dL"),
    ("ldl cholesterol", "mmol/l"): lambda v: (round(v * 38.67, 1), "mg/dL"),
    ("hdl cholesterol", "mmol/l"): lambda v: (round(v * 38.67, 1), "mg/dL"),
    ("triglycerides", "mmol/l"): lambda v: (round(v * 88.57, 1), "mg/dL"),
    ("creatinine", "umol/l"): lambda v: (round(v / 88.4, 2), "mg/dL"),
    ("creatinine", "µmol/l"): lambda v: (round(v / 88.4, 2), "mg/dL"),
    ("total bilirubin", "umol/l"): lambda v: (round(v / 17.1, 2), "mg/dL"),
    ("total bilirubin", "µmol/l"): lambda v: (round(v / 17.1, 2), "mg/dL"),
}


def normalize_extracted_row(raw_test_name: str, value: float, raw_unit: str, confidence: float = 1.0) -> Dict[str, Any]:
    """
    Normalizes extracted OCR row:
      1) Maps raw test name to canonical name via alias lookup
      2) Converts non-standard units (e.g. mmol/L -> mg/dL)
      3) Evaluates confidence threshold (< 0.75) and sets needs_review flag
    """
    clean_name = raw_test_name.lower().strip()
    canonical_name = TEST_NAME_ALIASES.get(clean_name, raw_test_name.title())

    clean_unit = raw_unit.lower().strip()
    final_val = float(value)
    final_unit = raw_unit.strip()
    unit_converted = False

    conv_key = (canonical_name.lower(), clean_unit)
    if conv_key in UNIT_CONVERSIONS:
        final_val, final_unit = UNIT_CONVERSIONS[conv_key](final_val)
        unit_converted = True

    # Low-confidence or unit conversion triggers human review flag
    needs_review = (confidence < 0.75) or (clean_name not in TEST_NAME_ALIASES) or unit_converted

    return {
        "raw_test_name": raw_test_name,
        "canonical_name": canonical_name,
        "value": final_val,
        "unit": final_unit,
        "original_unit": raw_unit,
        "confidence": confidence,
        "unit_converted": unit_converted,
        "needs_review": needs_review,
        "review_reason": "Low OCR confidence" if confidence < 0.75 else ("Converted units" if unit_converted else None),
    }
