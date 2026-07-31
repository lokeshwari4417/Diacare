"""
============================================================
 AI INTEGRATION POINT #1 -- Risk Prediction Model
============================================================
This file is intentionally a MOCK. A teammate will replace the body of
`predict()` and `simulate_single_feature()` with real inference against
trained artifacts (diabetes_model.pkl, imputer.pkl, explainer.pkl -- see
backend/models/train.py and the model card).

CONTRACT (do not change these signatures -- the rest of the app is built
against them):

    predict(inputs: dict) -> dict
        inputs: the 8 clinical features, keyed exactly as in
            ClinicalInput (pregnancies, glucose, blood_pressure,
            skin_thickness, insulin, bmi, diabetes_pedigree_function, age)
        returns: {
            "probability": float in [0, 1],
            "shap_values": {feature_name: float, ...}  # signed contribution
        }

    simulate_single_feature(base_inputs: dict, feature: str, new_value: float) -> float
        returns: updated probability in [0, 1]

Swap-in plan for the real model:
    1. Load model.pkl / imputer.pkl / explainer.pkl once at module import
       time (see the commented-out block below).
    2. Replace the body of predict() with real imputation + model.predict_proba
       + explainer.shap_values(...), keeping the same return shape.
    3. Nothing else in the codebase needs to change.
"""
import hashlib
import math
from typing import Dict

FEATURE_ORDER = [
    "pregnancies", "glucose", "blood_pressure", "skin_thickness",
    "insulin", "bmi", "diabetes_pedigree_function", "age",
]

# Rough "risk direction" weights used only by the mock to produce a
# plausible, explainable-looking probability and SHAP-like breakdown.
# These are NOT clinically calibrated -- purely for demo purposes until
# the real trained model is dropped in.
_MOCK_WEIGHTS = {
    "pregnancies": 0.02,
    "glucose": 0.012,
    "blood_pressure": 0.006,
    "skin_thickness": 0.004,
    "insulin": 0.0015,
    "bmi": 0.045,
    "diabetes_pedigree_function": 0.6,
    "age": 0.02,
}
_MOCK_BASELINE = {
    "pregnancies": 2, "glucose": 110, "blood_pressure": 70, "skin_thickness": 22,
    "insulin": 80, "bmi": 24, "diabetes_pedigree_function": 0.4, "age": 33,
}

# ---- Real-model loading would go here, e.g.: ----
# import pickle
# _MODEL = pickle.load(open("backend/models/diabetes_model.pkl", "rb"))
# _IMPUTER = pickle.load(open("backend/models/imputer.pkl", "rb"))
# _EXPLAINER = pickle.load(open("backend/models/explainer.pkl", "rb"))


def _sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def _deterministic_jitter(inputs: Dict) -> float:
    """Small deterministic pseudo-random offset so identical inputs always
    produce identical output (useful for demos/tests), without needing a
    real model. Derived from a hash of the rounded inputs."""
    key = "|".join(f"{k}:{round(float(v), 2)}" for k, v in sorted(inputs.items()))
    digest = hashlib.sha256(key.encode()).hexdigest()
    # map first 8 hex chars to a float in [-0.15, 0.15]
    n = int(digest[:8], 16) / 0xFFFFFFFF
    return (n - 0.5) * 0.3


def predict(inputs: Dict) -> Dict:
    """MOCK implementation. See module docstring for the real-model contract."""
    z = -1.2  # baseline logit
    shap_values = {}
    for feature, weight in _MOCK_WEIGHTS.items():
        value = float(inputs[feature])
        baseline = _MOCK_BASELINE[feature]
        contribution = weight * (value - baseline)
        shap_values[feature] = contribution
        z += contribution

    z += _deterministic_jitter(inputs)
    probability = max(0.01, min(0.99, _sigmoid(z)))

    return {"probability": probability, "shap_values": shap_values}


def simulate_single_feature(base_inputs: Dict, feature: str, new_value: float) -> float:
    """MOCK implementation. Returns the updated probability when one
    modifiable feature (glucose/bmi/blood_pressure) is changed, holding
    everything else constant."""
    modified = dict(base_inputs)
    modified[feature] = new_value
    return predict(modified)["probability"]
