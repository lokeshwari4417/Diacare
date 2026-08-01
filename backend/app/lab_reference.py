"""
Canonical Reference Range Lookup Table for 20 Common Lab Tests.
Supports data-driven age-, sex-, and pregnancy-specific range variants with fallback to general adult defaults.
"""
from typing import Optional, Dict, Any, List

LAB_TEST_REFERENCE = {
    "fasting_glucose": {
        "canonical_name": "Fasting Glucose",
        "aliases": ["glucose", "fasting blood sugar", "fbs", "fasting plasma glucose"],
        "unit": "mg/dL",
        "category": "Metabolic / Diabetes",
        "explanation": "Measures blood sugar concentration after an overnight fast. Key indicator for glucose metabolism.",
        "causes_high": ["Prediabetes or diabetes", "Stress or recent illness", "Certain medications (e.g. steroids)"],
        "causes_low": ["Excess insulin or hypoglycemia", "Prolonged fasting", "Strenuous exertion"],
        "variants": [
            {"condition": lambda a, s, p: p is True, "ref_low": 70.0, "ref_high": 95.0, "label": "Pregnancy (Gestational Targets)"},
        ],
        "default": {"ref_low": 70.0, "ref_high": 99.0, "label": "General Adult"},
    },
    "hba1c": {
        "canonical_name": "HbA1c",
        "aliases": ["a1c", "glycated hemoglobin", "hemoglobin a1c"],
        "unit": "%",
        "category": "Metabolic / Diabetes",
        "explanation": "Reflects average blood sugar control over the past 2 to 3 months.",
        "causes_high": ["Poorly controlled blood sugar", "Prediabetes or diabetes", "Altered red blood cell lifespan"],
        "causes_low": ["Recent blood loss or anemia", "Hemolytic conditions"],
        "default": {"ref_low": 4.0, "ref_high": 5.6, "label": "General Adult"},
    },
    "total_cholesterol": {
        "canonical_name": "Total Cholesterol",
        "aliases": ["cholesterol", "serum cholesterol"],
        "unit": "mg/dL",
        "category": "Lipids / Cardiovascular",
        "explanation": "Measures the overall amount of cholesterol (both HDL and LDL) in blood.",
        "causes_high": ["High dietary saturated fat", "Sedentary lifestyle", "Familial hypercholesterolemia"],
        "causes_low": ["Malnutrition or malabsorption", "Hyperthyroidism", "Severe liver disease"],
        "default": {"ref_low": 125.0, "ref_high": 199.0, "label": "General Adult"},
    },
    "ldl": {
        "canonical_name": "LDL Cholesterol",
        "aliases": ["ldl-c", "low density lipoprotein", "bad cholesterol"],
        "unit": "mg/dL",
        "category": "Lipids / Cardiovascular",
        "explanation": "Often termed 'bad' cholesterol because elevated levels can build up in arterial walls.",
        "causes_high": ["Diet high in saturated/trans fats", "Lack of physical activity", "Genetic factors"],
        "causes_low": ["Genetic hypo-LDL", "Hyperthyroidism", "Severe malnutrition"],
        "default": {"ref_low": 0.0, "ref_high": 99.0, "label": "General Adult"},
    },
    "hdl": {
        "canonical_name": "HDL Cholesterol",
        "aliases": ["hdl-c", "high density lipoprotein", "good cholesterol"],
        "unit": "mg/dL",
        "category": "Lipids / Cardiovascular",
        "explanation": "'Good' cholesterol that helps carry cholesterol away from arterial walls back to the liver.",
        "causes_high": ["Regular aerobic exercise", "Healthy fats intake", "Estrogen therapy"],
        "causes_low": ["Sedentary lifestyle", "Smoking", "Metabolic syndrome or obesity"],
        "variants": [
            {"condition": lambda a, s, p: s == "female", "ref_low": 50.0, "ref_high": 60.0, "label": "Adult Female"},
            {"condition": lambda a, s, p: s == "male", "ref_low": 40.0, "ref_high": 60.0, "label": "Adult Male"},
        ],
        "default": {"ref_low": 40.0, "ref_high": 60.0, "label": "General Adult"},
    },
    "triglycerides": {
        "canonical_name": "Triglycerides",
        "aliases": ["trig", "tg"],
        "unit": "mg/dL",
        "category": "Lipids / Cardiovascular",
        "explanation": "A type of lipid stored in body fat; elevated levels increase cardiovascular risk.",
        "causes_high": ["High simple carbohydrate intake", "Excess alcohol consumption", "Uncontrolled diabetes"],
        "causes_low": ["Very low fat diet", "Malnutrition", "Hyperthyroidism"],
        "default": {"ref_low": 0.0, "ref_high": 149.0, "label": "General Adult"},
    },
    "alt": {
        "canonical_name": "ALT (SGPT)",
        "aliases": ["alanin aminotransferase", "sgpt"],
        "unit": "U/L",
        "category": "Liver Function",
        "explanation": "An enzyme primarily found in liver cells; released into bloodstream when liver cells are damaged.",
        "causes_high": ["Fatty liver disease", "Alcohol use or medication strain", "Hepatitis or liver inflammation"],
        "causes_low": ["Normal finding or Vitamin B6 deficiency"],
        "variants": [
            {"condition": lambda a, s, p: s == "male", "ref_low": 7.0, "ref_high": 56.0, "label": "Adult Male"},
            {"condition": lambda a, s, p: s == "female", "ref_low": 7.0, "ref_high": 45.0, "label": "Adult Female"},
        ],
        "default": {"ref_low": 7.0, "ref_high": 56.0, "label": "General Adult"},
    },
    "ast": {
        "canonical_name": "AST (SGOT)",
        "aliases": ["aspartate aminotransferase", "sgot"],
        "unit": "U/L",
        "category": "Liver Function",
        "explanation": "Enzyme present in liver and muscle tissue; elevated levels signal liver or tissue strain.",
        "causes_high": ["Liver cellular strain", "Strenuous muscle exercise", "Alcohol use"],
        "causes_low": ["Normal finding or Vitamin B6 deficiency"],
        "default": {"ref_low": 10.0, "ref_high": 40.0, "label": "General Adult"},
    },
    "ggt": {
        "canonical_name": "GGT",
        "aliases": ["gamma glutamyl transferase"],
        "unit": "U/L",
        "category": "Liver Function",
        "explanation": "Liver enzyme sensitive to bile duct function, alcohol exposure, and oxidative stress.",
        "causes_high": ["Bile duct obstruction", "Alcohol consumption", "Fatty liver changes"],
        "causes_low": ["Normal finding"],
        "variants": [
            {"condition": lambda a, s, p: s == "male", "ref_low": 9.0, "ref_high": 48.0, "label": "Adult Male"},
            {"condition": lambda a, s, p: s == "female", "ref_low": 9.0, "ref_high": 38.0, "label": "Adult Female"},
        ],
        "default": {"ref_low": 9.0, "ref_high": 48.0, "label": "General Adult"},
    },
    "total_bilirubin": {
        "canonical_name": "Total Bilirubin",
        "aliases": ["bilirubin"],
        "unit": "mg/dL",
        "category": "Liver Function",
        "explanation": "Yellow byproduct of normal red blood cell breakdown processed by the liver.",
        "causes_high": ["Bile duct blockage", "Gilbert's syndrome", "Increased RBC breakdown"],
        "causes_low": ["Normal finding"],
        "default": {"ref_low": 0.1, "ref_high": 1.2, "label": "General Adult"},
    },
    "creatinine": {
        "canonical_name": "Creatinine",
        "aliases": ["serum creatinine", "creat"],
        "unit": "mg/dL",
        "category": "Kidney Function",
        "explanation": "Waste product from muscle breakdown filtered out of blood by kidneys.",
        "causes_high": ["Reduced kidney filtration efficiency", "Dehydration", "High muscle mass"],
        "causes_low": ["Low muscle mass", "Severe liver disease", "Pregnancy"],
        "variants": [
            {"condition": lambda a, s, p: s == "male", "ref_low": 0.7, "ref_high": 1.3, "label": "Adult Male"},
            {"condition": lambda a, s, p: s == "female", "ref_low": 0.6, "ref_high": 1.1, "label": "Adult Female"},
        ],
        "default": {"ref_low": 0.6, "ref_high": 1.2, "label": "General Adult"},
    },
    "egfr": {
        "canonical_name": "eGFR",
        "aliases": ["estimated gfr", "gfr"],
        "unit": "mL/min/1.73m2",
        "category": "Kidney Function",
        "explanation": "Calculated rate measuring how efficiently kidneys filter waste from blood.",
        "causes_high": ["Normal healthy renal filtration", "Hyperfiltration"],
        "causes_low": ["Decreased kidney function", "Acute kidney injury", "Dehydration"],
        "variants": [
            {"condition": lambda a, s, p: a is not None and a < 18, "ref_low": 70.0, "ref_high": 130.0, "label": "Pediatric"},
        ],
        "default": {"ref_low": 60.0, "ref_high": 120.0, "label": "General Adult"},
    },
    "bun": {
        "canonical_name": "BUN",
        "aliases": ["blood urea nitrogen", "urea"],
        "unit": "mg/dL",
        "category": "Kidney Function",
        "explanation": "Measures urea nitrogen waste in blood derived from protein digestion.",
        "causes_high": ["Dehydration", "High protein diet", "Kidney dysfunction"],
        "causes_low": ["Low protein diet", "Severe liver disease", "Overhydration"],
        "default": {"ref_low": 7.0, "ref_high": 20.0, "label": "General Adult"},
    },
    "hemoglobin": {
        "canonical_name": "Hemoglobin",
        "aliases": ["hgb", "hb"],
        "unit": "g/dL",
        "category": "Hematology / CBC",
        "explanation": "Iron-rich protein in red blood cells that carries oxygen throughout the body.",
        "causes_high": ["Dehydration", "High altitude living", "Smoking or lung disease"],
        "causes_low": ["Iron deficiency anemia", "Nutritional deficiencies", "Blood loss"],
        "variants": [
            {"condition": lambda a, s, p: a is not None and a < 18, "ref_low": 11.0, "ref_high": 14.5, "label": "Pediatric"},
            {"condition": lambda a, s, p: s == "male", "ref_low": 13.5, "ref_high": 17.5, "label": "Adult Male"},
            {"condition": lambda a, s, p: s == "female", "ref_low": 12.0, "ref_high": 15.5, "label": "Adult Female"},
        ],
        "default": {"ref_low": 12.0, "ref_high": 17.5, "label": "General Adult"},
    },
    "tsh": {
        "canonical_name": "TSH",
        "aliases": ["thyroid stimulating hormone"],
        "unit": "mIU/L",
        "category": "Thyroid Function",
        "explanation": "Pituitary hormone that regulates thyroid gland activity.",
        "causes_high": ["Underactive thyroid (hypothyroidism)", "Thyroiditis"],
        "causes_low": ["Overactive thyroid (hyperthyroidism)", "Certain medications"],
        "variants": [
            {"condition": lambda a, s, p: p is True, "ref_low": 0.2, "ref_high": 2.5, "label": "Pregnancy Trimester 1"},
        ],
        "default": {"ref_low": 0.4, "ref_high": 4.0, "label": "General Adult"},
    },
    "potassium": {
        "canonical_name": "Potassium",
        "aliases": ["k", "k+"],
        "unit": "mEq/L",
        "category": "Electrolytes",
        "explanation": "Essential electrolyte for nerve signaling and muscle/heart rhythm regulation.",
        "causes_high": ["Kidney dysfunction", "Certain blood pressure drugs", "Cellular injury"],
        "causes_low": ["Diuretic usage", "Vomiting or diarrhea", "Low dietary intake"],
        "default": {"ref_low": 3.5, "ref_high": 5.0, "label": "General Adult"},
    },
    "sodium": {
        "canonical_name": "Sodium",
        "aliases": ["na", "na+"],
        "unit": "mEq/L",
        "category": "Electrolytes",
        "explanation": "Key electrolyte that regulates fluid balance and cellular hydration.",
        "causes_high": ["Dehydration", "High sodium intake", "Excessive water loss"],
        "causes_low": ["Excess fluid retention", "Diuretics", "Heart or kidney failure"],
        "default": {"ref_low": 135.0, "ref_high": 145.0, "label": "General Adult"},
    },
    "platelets": {
        "canonical_name": "Platelets",
        "aliases": ["plt", "platelet count"],
        "unit": "x10^3/uL",
        "category": "Hematology / CBC",
        "explanation": "Cell fragments essential for normal blood clotting and tissue repair.",
        "causes_high": ["Inflammation or infection", "Iron deficiency", "Post-splenectomy"],
        "causes_low": ["Viral infections", "Autoimmune conditions", "Medication effects"],
        "default": {"ref_low": 150.0, "ref_high": 450.0, "label": "General Adult"},
    },
    "wbc": {
        "canonical_name": "WBC",
        "aliases": ["white blood cells", "white blood count"],
        "unit": "x10^3/uL",
        "category": "Hematology / CBC",
        "explanation": "Immune system cells that defend the body against infections.",
        "causes_high": ["Active infection or inflammation", "Physical or emotional stress", "Steroid use"],
        "causes_low": ["Viral infections", "Bone marrow suppression", "Autoimmune disorders"],
        "default": {"ref_low": 4.5, "ref_high": 11.0, "label": "General Adult"},
    },
    "rbc": {
        "canonical_name": "RBC",
        "aliases": ["red blood cells", "red blood count"],
        "unit": "x10^6/uL",
        "category": "Hematology / CBC",
        "explanation": "Cells responsible for transporting oxygen from lungs to body tissues.",
        "causes_high": ["Dehydration", "Chronic hypoxia or smoking", "Polycythemia"],
        "causes_low": ["Anemia", "Blood loss", "Nutritional deficits"],
        "variants": [
            {"condition": lambda a, s, p: s == "male", "ref_low": 4.3, "ref_high": 5.9, "label": "Adult Male"},
            {"condition": lambda a, s, p: s == "female", "ref_low": 3.8, "ref_high": 5.2, "label": "Adult Female"},
        ],
        "default": {"ref_low": 4.2, "ref_high": 5.9, "label": "General Adult"},
    },
}


def find_test_reference(raw_name: str) -> Optional[dict]:
    """Helper to match a user input test name against canonical reference items."""
    clean = raw_name.lower().strip()
    for key, data in LAB_TEST_REFERENCE.items():
        if clean == key or clean == data["canonical_name"].lower():
            return data
        if any(clean == alias for alias in data.get("aliases", [])):
            return data
    for key, data in LAB_TEST_REFERENCE.items():
        if key in clean or clean in data["canonical_name"].lower():
            return data
    return None


def get_test_reference_range(raw_name: str, age: Optional[int] = None, sex: Optional[str] = None, is_pregnant: Optional[bool] = None) -> dict:
    """
    Selects the matching reference range variant based on patient demographics.
    Falls back gracefully to general adult range if demographics are not specified.
    """
    ref = find_test_reference(raw_name)
    if not ref:
        return {
            "canonical_name": raw_name.title(),
            "ref_low": 0.0,
            "ref_high": 100.0,
            "unit": "unit",
            "category": "General",
            "is_demographic_adjusted": False,
            "variant_label": "General Range",
            "explanation": f"{raw_name} recorded.",
            "causes_high": [],
            "causes_low": [],
        }

    clean_sex = sex.lower().strip() if sex else None
    clean_age = int(age) if age is not None else None
    clean_preg = bool(is_pregnant) if is_pregnant is not None else False

    variants = ref.get("variants", [])
    selected_variant = None

    for v in variants:
        try:
            if v["condition"](clean_age, clean_sex, clean_preg):
                selected_variant = v
                break
        except Exception:
            continue

    if selected_variant:
        ref_low = selected_variant["ref_low"]
        ref_high = selected_variant["ref_high"]
        label = selected_variant["label"]
        is_adjusted = True
    else:
        d = ref["default"]
        ref_low = d["ref_low"]
        ref_high = d["ref_high"]
        label = d["label"]
        is_adjusted = False

    # Backwards compatibility fields for Phase 1 code expecting ref_low/ref_high on ref dictionary
    res = dict(ref)
    res["ref_low"] = ref_low
    res["ref_high"] = ref_high
    res["is_demographic_adjusted"] = is_adjusted
    res["variant_label"] = label
    return res
