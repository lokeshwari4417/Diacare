"""
AI Integration Point -- DiaCare Diabetes Risk & Lifestyle Chatbot.
Uses Google Gemini API ('gemini-2.0-flash') to provide personalized, multilingual,
supportive lifestyle guidance based on the patient's screening results.
"""
import os
import re
from typing import Optional, List

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

_BANNED_PATTERNS = [
    r"\byou have diabetes\b",
    r"\bdiagnos\w*\b",
]

_FAQ = [
    (
        ["food", "diet", "eat", "nutrition", "sugar", "carbs"],
        "A healthy diet for diabetes risk management emphasizes whole foods, vegetables, high-fiber legumes, and lean proteins while limiting sugary drinks and refined carbs. For personalized meal planning, please consult a healthcare provider.",
    ),
    (
        ["exercise", "activity", "walk", "workout"],
        "Aim for at least 150 minutes of moderate physical activity (like brisk walking) each week. Always check with your doctor before starting a new exercise regimen.",
    ),
    (
        ["risk", "score", "result", "report"],
        "Your screening score estimate is based on statistical risk factors like glucose, BMI, and age. Remember, this tool provides a preliminary risk estimate—not a medical diagnosis.",
    ),
]

_DEFAULT_REPLY = (
    "I am your DiaCare Lifestyle Guide! I can offer practical advice on nutrition, exercise, "
    "and healthy habits based on your screening results. Please note that this is general guidance, "
    "not a medical diagnosis—always consult a doctor for personalized medical care."
)

SYSTEM_PROMPT = """
You are the DiaCare AI Lifestyle Assistant, a warm, supportive, and empathetic lifestyle guide for diabetes risk awareness and healthy living.

PATIENT SCREENING RESULT CONTEXT:
- Risk Band: {risk_band}
- Estimated Risk Score: {risk_score}
- Key Contributing Risk Factors: {top_factors}
- Clinical Data Summary: {report_summary}
- Target Language Hint: {language_hint}

STRICT ROLE & GUIDELINES:
1. ACT AS A SUPPORTIVE LIFESTYLE GUIDE, NOT A DOCTOR. Do NOT make definitive diagnostic claims or use words stating "you have diabetes". Always refer to "estimated risk" or "screening result".
2. NO MEDICATIONS: Do NOT prescribe specific medications, drug dosages, or medical treatment plans.
3. TAILORED ADVICE: Provide practical, general guidance on:
   - Diet & Nutrition: Foods to eat (high-fiber, whole grains, non-starchy vegetables) and foods to avoid/limit (sugary beverages, refined sugars).
   - Exercise & Activity: Safe physical activities to consider (brisk walking, swimming, light cardio).
   - Lifestyle Habits: Hydration, sleep, and weight management suited to their risk level ({risk_band}).
4. MANDATORY DISCLAIMER: ALWAYS include a brief, gentle reminder that your guidance is for educational and lifestyle purposes only, not a medical diagnosis or treatment plan, and that they should consult a doctor for personalized advice (especially important for Moderate or High risk).
5. MULTILINGUAL RESPONSE: Automatically detect the language of the user's message (or follow the language hint '{language_hint}') and respond in that EXACT SAME LANGUAGE.
6. TONE: Warm, encouraging, clear, and easy to understand without heavy medical jargon.

User Question: {user_message}
"""


def _sanitize(text: str) -> str:
    """Ensure non-negotiable copy safety rules."""
    sanitized = text
    for pattern in _BANNED_PATTERNS:
        sanitized = re.sub(pattern, "risk estimate", sanitized, flags=re.IGNORECASE)
    return sanitized


def respond_with_gemini(
    message: str,
    risk_band: str = "Unknown",
    risk_score: str = "N/A",
    top_factors: str = "N/A",
    report_summary: str = "N/A",
    language_hint: str = "English",
) -> Optional[str]:
    """Sends user message and patient context to Gemini API (gemini-2.0-flash)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not HAS_GENAI or not api_key:
        print("GEMINI_API_KEY not set or google.generativeai missing. Falling back to local responder.")
        return None

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = SYSTEM_PROMPT.format(
            risk_band=risk_band,
            risk_score=risk_score,
            top_factors=top_factors,
            report_summary=report_summary,
            language_hint=language_hint or "English",
            user_message=message,
        )

        response = model.generate_content(prompt)
        if response and response.text:
            return _sanitize(response.text.strip())
    except Exception as e:
        print(f"Gemini API Exception: {e}")
        return None


def respond(
    message: str,
    mode: str = "patient",
    context_report_id: Optional[str] = None,
    risk_band: str = "Unknown",
    risk_score: str = "N/A",
    top_factors: str = "N/A",
    report_summary: str = "N/A",
    language: str = "English",
) -> str:
    """Primary chat responder: tries Gemini API first, falls back to structured FAQ."""
    # Attempt Gemini API response first
    gemini_reply = respond_with_gemini(
        message=message,
        risk_band=risk_band,
        risk_score=risk_score,
        top_factors=top_factors,
        report_summary=report_summary,
        language_hint=language,
    )
    if gemini_reply:
        return gemini_reply

    # Fallback keyword responder
    lowered = message.lower()
    reply = _DEFAULT_REPLY
    for keywords, canned in _FAQ:
        if any(kw in lowered for kw in keywords):
            reply = canned
            break

    return _sanitize(reply)
