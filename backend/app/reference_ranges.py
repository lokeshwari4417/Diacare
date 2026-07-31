"""
General-population reference ranges used for the Reference Comparison panel
(Section 5.3). These are general guidance ranges (WHO/ADA-style), not
individualized clinical thresholds -- always presented with that caveat.
"""
from typing import List
from . import schemas

# (low, high, unit, source)
_RANGES = {
    "glucose": (70, 140, "mg/dL", "WHO/ADA general fasting-to-postprandial guidance"),
    "blood_pressure": (60, 80, "mm Hg", "ADA general diastolic BP guidance"),
    "bmi": (18.5, 24.9, "kg/m\u00b2", "WHO BMI classification"),
    "skin_thickness": (10, 40, "mm", "General population triceps skinfold reference"),
    "insulin": (16, 166, "mu U/mL", "General 2-hr serum insulin reference"),
}

_LABELS = {
    "glucose": "Glucose",
    "blood_pressure": "Blood Pressure",
    "bmi": "BMI",
    "skin_thickness": "Skin Thickness",
    "insulin": "Insulin",
}


def build_reference_comparison(inputs: dict) -> List[schemas.ReferenceRangeItem]:
    items = []
    for key, (low, high, unit, source) in _RANGES.items():
        value = float(inputs[key])
        if low <= value <= high:
            status = "in_range"
        elif value < low * 0.85 or value > high * 1.15:
            status = "out_of_range"
        else:
            status = "borderline"
        items.append(
            schemas.ReferenceRangeItem(
                feature=_LABELS[key],
                value=value,
                low=low,
                high=high,
                unit=unit,
                status=status,
                source=source,
            )
        )
    return items
