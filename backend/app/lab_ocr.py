"""
Phase 2 OCR Extraction & Test Name Matching Engine.
Uses Gemini Vision (gemini-2.0-flash) to extract structured lab test data from images/PDFs.
"""
import os
import json
import re
from typing import List, Dict, Any, Tuple

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

from .lab_reference import find_test_reference, LAB_TEST_REFERENCE


def match_test_name(raw_name: str) -> Dict[str, Any]:
    """
    Fuzzy/alias matching against the Phase 1 lab reference dataset.
    Returns matched canonical name and confidence flag.
    """
    if not raw_name:
        return {"canonical_name": "Unknown Test", "is_matched": False, "unit": "mg/dL", "category": "General"}

    ref = find_test_reference(raw_name)
    if ref:
        return {
            "canonical_name": ref["canonical_name"],
            "is_matched": True,
            "unit": ref["unit"],
            "category": ref["category"],
        }
    
    return {
        "canonical_name": raw_name.title().strip(),
        "is_matched": False,
        "unit": "mg/dL",
        "category": "Unmatched Lab Entry",
    }


def extract_lab_data_from_file(file_path: str, source_type: str = "image") -> Dict[str, Any]:
    """
    Extracts structured test result rows from an image or PDF using Gemini Vision.
    Returns extracted items list and raw OCR string for audit.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not HAS_GENAI or not api_key:
        print("GEMINI_API_KEY missing or google.generativeai not installed. Returning fallback draft.")
        return {
            "extracted_results": [
                {"test_name_raw": "Fasting Glucose", "value": 115.0, "unit": "mg/dL", "reference_range_raw": "70-99"},
                {"test_name_raw": "HbA1c", "value": 6.2, "unit": "%", "reference_range_raw": "4.0-5.6"},
            ],
            "raw_ocr_text": "Sample fallback OCR output.",
        }

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        # Determine MIME type
        lower_path = file_path.lower()
        if source_type == "pdf" or lower_path.endswith(".pdf"):
            mime_type = "application/pdf"
        elif lower_path.endswith(".png"):
            mime_type = "image/png"
        else:
            mime_type = "image/jpeg"

        prompt = (
            "You are an expert clinical laboratory report OCR parser.\n"
            "Extract all laboratory blood/urine test results printed in this document.\n"
            "Return ONLY a valid JSON array of objects with these exact keys:\n"
            '  - "test_name_raw": string (exact printed test name)\n'
            '  - "value": number (numeric value as a float or integer, e.g. 110.5)\n'
            '  - "unit": string (e.g. "mg/dL", "%", "U/L")\n'
            '  - "reference_range_raw": string (optional reference range, e.g. "70 - 99")\n\n'
            "CRITICAL INSTRUCTIONS:\n"
            "1. Output raw JSON only. Do NOT surround with markdown code blocks (no ```json or ```).\n"
            "2. Extract ONLY rows with numeric values.\n"
            "3. If no lab test values are found, return []."
        )

        contents = [
            {"mime_type": mime_type, "data": file_bytes},
            prompt,
        ]

        response = model.generate_content(contents)
        raw_text = response.text.strip() if response and response.text else ""

        # Clean markdown code block fences if present
        clean_json_str = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.IGNORECASE)
        clean_json_str = re.sub(r"\s*```$", "", clean_json_str).strip()

        extracted_items = []
        if clean_json_str:
            try:
                parsed = json.loads(clean_json_str)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and "test_name_raw" in item and "value" in item:
                            try:
                                val_num = float(item["value"])
                                extracted_items.append({
                                    "test_name_raw": str(item["test_name_raw"]),
                                    "value": val_num,
                                    "unit": str(item.get("unit") or "mg/dL"),
                                    "reference_range_raw": str(item.get("reference_range_raw") or ""),
                                })
                            except (ValueError, TypeError):
                                continue
            except Exception as json_err:
                print(f"Failed to parse OCR JSON output: {json_err}. Raw output was: {raw_text[:200]}")

        return {
            "extracted_results": extracted_items,
            "raw_ocr_text": raw_text,
        }

    except Exception as e:
        print(f"Error executing Gemini Vision OCR: {e}")
        return {
            "extracted_results": [],
            "raw_ocr_text": f"Error during OCR extraction: {str(e)}",
        }
