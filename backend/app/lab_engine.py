"""
Lab Interpretation, Risk-Flag, and Recommendation Engine for Phase 1-5.
Supports demographic-aware (age, sex, pregnancy) reference range selection while remaining 100% backward compatible.
"""
from typing import List, Dict, Any, Optional
from .lab_reference import find_test_reference, get_test_reference_range


def interpret_result(
    test_name: str,
    value: float,
    unit: str,
    age: Optional[int] = None,
    sex: Optional[str] = None,
    is_pregnant: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Computes status (low / normal / borderline / high) based on reference range.
    Accepts optional age, sex, and is_pregnant keyword arguments.
    """
    ref = get_test_reference_range(test_name, age=age, sex=sex, is_pregnant=is_pregnant)
    
    ref_low = ref["ref_low"]
    ref_high = ref["ref_high"]
    category = ref.get("category", "General")
    canonical_name = ref.get("canonical_name", test_name.title())
    is_adjusted = ref.get("is_demographic_adjusted", False)
    variant_label = ref.get("variant_label", "General Range")

    span = ref_high - ref_low
    margin = span * 0.10 if span > 0 else 0.5

    status = "normal"
    adj_note = f" (Adjusted for {variant_label})" if is_adjusted else ""
    explanation = f"{canonical_name} is within the normal healthy reference range ({ref_low} - {ref_high} {unit}){adj_note}."
    possible_causes = ["Optimal balance and health"]

    if value < ref_low:
        status = "low"
        explanation = f"{canonical_name} is below the lower reference threshold ({ref_low} {unit}){adj_note}."
        possible_causes = ref.get("causes_low", ["Individual physiological variance"])
    elif value > ref_high:
        status = "high"
        explanation = f"{canonical_name} is above the upper reference threshold ({ref_high} {unit}){adj_note}."
        possible_causes = ref.get("causes_high", ["Individual physiological variance"])
    else:
        if (value - ref_low) <= margin:
            status = "borderline"
            explanation = f"{canonical_name} is near the lower boundary of the reference range ({ref_low} {unit}){adj_note}."
            possible_causes = ref.get("causes_low", ["Early physiological trend"])
        elif (ref_high - value) <= margin:
            status = "borderline"
            explanation = f"{canonical_name} is near the upper boundary of the reference range ({ref_high} {unit}){adj_note}."
            possible_causes = ref.get("causes_high", ["Early physiological trend"])

    return {
        "test_name_normalized": canonical_name,
        "status_enum": status,
        "ref_low": ref_low,
        "ref_high": ref_high,
        "category": category,
        "is_demographic_adjusted": is_adjusted,
        "variant_label": variant_label,
        "plain_language_explanation": explanation,
        "possible_causes": [f"Can include: {c}" for c in possible_causes],
    }


def evaluate_risk_flags(
    test_results: List[Dict[str, Any]],
    sex: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Tier 1 Rule-Based Risk Flag Evaluation with optional sex threshold adjustment.
    """
    results_map = {r["test_name_normalized"].lower(): r for r in test_results}
    
    def get_result(key_substr):
        for k, v in results_map.items():
            if key_substr in k:
                return v
        return None

    flags = []

    glucose_r = get_result("fasting glucose") or get_result("glucose")
    hba1c_r = get_result("hba1c")
    alt_r = get_result("alt")
    ast_r = get_result("ast")
    ggt_r = get_result("ggt")
    ldl_r = get_result("ldl")
    hdl_r = get_result("hdl")
    hb_r = get_result("hemoglobin")

    # 1. Diabetes Pattern Check
    is_diabetes = False
    diabetes_triggers = []
    if glucose_r and glucose_r.get("value_numeric") is not None and glucose_r["value_numeric"] >= 126:
        is_diabetes = True
        diabetes_triggers.append(glucose_r["id"])
    if hba1c_r and hba1c_r.get("value_numeric") is not None and hba1c_r["value_numeric"] >= 6.5:
        is_diabetes = True
        diabetes_triggers.append(hba1c_r["id"])

    if is_diabetes:
        flags.append({
            "condition_name": "Pattern consistent with diabetes",
            "likelihood_enum": "high",
            "contributing_test_result_ids": diabetes_triggers,
            "rationale_text": "ADA clinical criteria: Fasting Glucose >= 126 mg/dL OR HbA1c >= 6.5%",
        })
    else:
        is_prediabetes = False
        prediabetes_triggers = []
        if glucose_r and glucose_r.get("value_numeric") is not None and (100 <= glucose_r["value_numeric"] <= 125):
            is_prediabetes = True
            prediabetes_triggers.append(glucose_r["id"])
        if hba1c_r and hba1c_r.get("value_numeric") is not None and (5.7 <= hba1c_r["value_numeric"] <= 6.4):
            is_prediabetes = True
            prediabetes_triggers.append(hba1c_r["id"])

        if is_prediabetes:
            flags.append({
                "condition_name": "Pattern consistent with prediabetes",
                "likelihood_enum": "moderate",
                "contributing_test_result_ids": prediabetes_triggers,
                "rationale_text": "ADA clinical criteria: Fasting Glucose 100-125 mg/dL OR HbA1c 5.7-6.4%",
            })

    # 2. Liver Stress Check
    alt_high = alt_r and alt_r.get("status_enum") in ("high", "borderline")
    ast_high = ast_r and ast_r.get("status_enum") in ("high", "borderline")
    ggt_high = ggt_r and ggt_r.get("status_enum") in ("high", "borderline")

    if alt_high and ast_high and ggt_high:
        elevated_count = sum(1 for r in [alt_r, ast_r, ggt_r] if r and r.get("status_enum") == "high")
        likelihood = "high" if elevated_count >= 2 else "moderate"
        flags.append({
            "condition_name": "Pattern consistent with liver stress",
            "likelihood_enum": likelihood,
            "contributing_test_result_ids": [alt_r["id"], ast_r["id"], ggt_r["id"]],
            "rationale_text": "Concomitant elevation in liver enzymes ALT, AST, and GGT",
        })

    # 3. Cardiovascular Risk Check
    ldl_high = ldl_r and ldl_r.get("status_enum") in ("high", "borderline")
    hdl_low = hdl_r and hdl_r.get("status_enum") in ("low", "borderline")

    if ldl_high and hdl_low:
        flags.append({
            "condition_name": "Elevated cardiovascular risk pattern",
            "likelihood_enum": "moderate",
            "contributing_test_result_ids": [ldl_r["id"], hdl_r["id"]],
            "rationale_text": "AHA lipid criteria: Elevated LDL combined with reduced HDL",
        })

    # 4. Anemia Check (Low Hemoglobin adjusted for sex)
    if hb_r:
        val = hb_r.get("value_numeric")
        status = hb_r.get("status_enum")
        if status == "low":
            cutoff_text = "WHO criteria: Hemoglobin below lower reference bound"
            if sex == "male":
                cutoff_text = "WHO male criteria: Hemoglobin < 13.5 g/dL"
            elif sex == "female":
                cutoff_text = "WHO female criteria: Hemoglobin < 12.0 g/dL"
            flags.append({
                "condition_name": "Pattern consistent with anemia",
                "likelihood_enum": "moderate",
                "contributing_test_result_ids": [hb_r["id"]],
                "rationale_text": cutoff_text,
            })

    return flags


def generate_recommendations(risk_flags: List[Dict[str, Any]], test_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates rule-based recommendations across categories.
    """
    recommendations = []
    flag_names = [f["condition_name"] for f in risk_flags]

    recommendations.append({
        "category": "hydration",
        "text": "Maintain optimal hydration by drinking 2 to 3 liters of water daily to support kidney filtration.",
    })
    recommendations.append({
        "category": "sleep",
        "text": "Prioritize 7 to 8 hours of restorative sleep to help regulate insulin sensitivity and cortisol levels.",
    })

    if "Pattern consistent with diabetes" in flag_names or "Pattern consistent with prediabetes" in flag_names:
        recommendations.append({
            "category": "diet",
            "text": "Emphasize low-glycemic, fiber-rich foods (vegetables, legumes, whole grains) and reduce refined sugars.",
        })
        recommendations.append({
            "category": "exercise",
            "text": "Aim for at least 150 minutes of moderate aerobic exercise (e.g. brisk walking) spread across the week.",
        })
        recommendations.append({
            "category": "follow-up-tests",
            "text": "Schedule a confirmatory Fasting Plasma Glucose or Oral Glucose Tolerance Test within 2-4 weeks.",
        })

    if "Pattern consistent with liver stress" in flag_names:
        recommendations.append({
            "category": "diet",
            "text": "Avoid alcoholic beverages, reduce saturated fat, and minimize unprescribed over-the-counter medications.",
        })
        recommendations.append({
            "category": "follow-up-tests",
            "text": "Consider a comprehensive liver panel and abdominal ultrasound consultation.",
        })

    if "Elevated cardiovascular risk pattern" in flag_names:
        recommendations.append({
            "category": "diet",
            "text": "Adopt a Mediterranean-style dietary pattern rich in omega-3 fatty acids, olive oil, nuts, and soluble fiber.",
        })
        recommendations.append({
            "category": "exercise",
            "text": "Include regular cardio exercises and lifestyle activity to raise HDL levels.",
        })

    if "Pattern consistent with anemia" in flag_names:
        recommendations.append({
            "category": "diet",
            "text": "Increase intake of iron-rich foods (leafy greens, legumes, lean meats) alongside Vitamin C.",
        })

    has_high = any(f["likelihood_enum"] == "high" for f in risk_flags)
    if has_high:
        recommendations.append({
            "category": "doctor-urgency",
            "text": "High priority: Schedule a clinical evaluation with a primary care physician within 1-2 weeks.",
        })
    else:
        recommendations.append({
            "category": "doctor-urgency",
            "text": "Routine care: Share this report with your physician during your next scheduled consultation.",
        })

    return recommendations
