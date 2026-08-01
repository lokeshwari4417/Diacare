"""
Central configuration for the DiaCare backend.
All values can be overridden via environment variables for deployment.
"""
import os
from datetime import timedelta

SECRET_KEY = os.getenv("DIACARE_SECRET_KEY", "dev-secret-change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("DIACARE_TOKEN_EXPIRE_MINUTES", "480"))

DATABASE_URL = os.getenv("DIACARE_DATABASE_URL", "sqlite:///./diacare.db")

CORS_ORIGINS = os.getenv("DIACARE_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,https://diacare-frontend.onrender.com,*").split(",")


# Risk band thresholds -- configurable, not hardcoded (Section 5.1 of spec)
RISK_THRESHOLDS = {
    "low_max": float(os.getenv("DIACARE_RISK_LOW_MAX", "0.33")),
    "moderate_max": float(os.getenv("DIACARE_RISK_MODERATE_MAX", "0.66")),
}

DISCLAIMER_TEXT = (
    "This tool provides a preliminary risk estimate based on statistical patterns. "
    "It is not a medical diagnosis. Please consult a qualified healthcare professional "
    "for any concerns, especially if your result is Moderate or High risk."
)
