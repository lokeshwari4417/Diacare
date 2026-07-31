"""
============================================================
 AI INTEGRATION POINT #2 -- Report-Scanning Model
============================================================
This file is intentionally a MOCK. A teammate will replace `extract_from_image()`
with a real detection+OCR pipeline (candidate stacks: YOLOv8, or a
TensorFlow-based pipeline, trained on Kaggle/Roboflow lab-report datasets)
that reads a photographed lab report / checkup printout and returns the
8 clinical values.

CONTRACT (do not change this signature):

    extract_from_image(image_bytes: bytes, filename: str) -> dict
        returns: {
            "extracted": { ...8 clinical fields... },
            "confidence": float in [0, 1],
        }

Privacy note (Section 9): the uploaded image is only held in memory for
the duration of this call. It is never written to disk or the database --
only the confirmed numeric values (after the user edits/approves them in
the confirmation step) are persisted.
"""
import hashlib
import random
from typing import Dict


def extract_from_image(image_bytes: bytes, filename: str) -> Dict:
    """MOCK implementation: returns a plausible, randomized-but-stable set
    of the 8 values, simulating what a real OCR/detection pipeline would
    return. Seeded from the image bytes so repeated uploads of the exact
    same file are stable for demo purposes."""
    seed = int(hashlib.sha256(image_bytes or filename.encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)

    extracted = {
        "pregnancies": rng.randint(0, 8),
        "glucose": round(rng.uniform(80, 180), 1),
        "blood_pressure": round(rng.uniform(60, 100), 1),
        "skin_thickness": round(rng.uniform(10, 45), 1),
        "insulin": round(rng.uniform(15, 250), 1),
        "bmi": round(rng.uniform(19, 40), 1),
        "diabetes_pedigree_function": round(rng.uniform(0.1, 1.5), 3),
        "age": rng.randint(21, 75),
    }
    confidence = round(rng.uniform(0.72, 0.97), 2)
    return {"extracted": extracted, "confidence": confidence}
