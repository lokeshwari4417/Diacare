"""
============================================================
 AI INTEGRATION POINT #3 -- Chatbot
============================================================
This file is intentionally a MOCK. A teammate will replace `respond()`
with a fine-tuned or RAG-backed model. The seam is this single function --
nothing else in the app needs to change when it's swapped in.

Scope (Section 3.1 / 9, non-negotiable even after the swap-in):
    (a) how to use the site
    (b) general diabetes education
    (c) explaining the user's own results in plain language
The bot must never output the words "diagnosis", "diagnose", or claim
"you have diabetes" -- always "risk", "estimate", "screening", "likelihood".
"""
import re
from typing import Optional

_BANNED_PATTERNS = [
    r"\byou have diabetes\b",
    r"\bdiagnos\w*\b",
]

_FAQ = [
    (
        ["upload", "scan", "photo", "picture of my report"],
        "To scan a report: go to your dashboard, choose 'Scan a Report', and "
        "upload a clear photo of your lab printout. We'll extract the values "
        "automatically, but you'll always get a chance to review and correct "
        "them before anything is submitted.",
    ),
    (
        ["how", "use", "navigate", "get started", "start"],
        "Getting started is simple: fill in the 8 screening fields (or scan a "
        "report), review the values, and submit. You'll get an instant risk "
        "estimate with an explanation of what's driving it, plus a downloadable "
        "PDF summary you can share with a doctor.",
    ),
    (
        ["pdf", "download", "report file"],
        "You can download a one-page PDF summary from your results screen -- "
        "look for the 'Download PDF' button. It includes your inputs, the risk "
        "estimate, top contributing factors, and reference ranges.",
    ),
    (
        ["what is diabetes", "diabetes education", "what causes diabetes"],
        "Diabetes is a group of conditions affecting how your body turns food "
        "into energy, generally linked to how well your body manages blood "
        "sugar (glucose). Type 2, the most common form, is influenced by a mix "
        "of genetics, weight, activity level, and age. A qualified healthcare "
        "professional is the right person to explain how this applies to you.",
    ),
    (
        ["glucose", "blood sugar"],
        "Glucose is the sugar circulating in your blood, and it's one of the "
        "strongest signals used in this screening tool. Higher readings, "
        "especially after fasting or a glucose tolerance test, are associated "
        "with higher estimated risk.",
    ),
    (
        ["bmi", "body mass index", "weight"],
        "BMI is a simple ratio of weight to height, used here as one of "
        "several inputs into your risk estimate. It's a general population "
        "measure and doesn't capture things like muscle mass, so it's just "
        "one piece of the picture.",
    ),
    (
        ["what is my risk", "explain my result", "why is my risk", "my report", "my result"],
        "I can walk you through what's driving your estimate -- the "
        "Explainability panel on your results screen lists the top factors "
        "and whether each one is pushing your estimate up or down, in plain "
        "language.",
    ),
    (
        ["accurate", "trust", "reliable"],
        "This tool gives a preliminary, statistics-based risk estimate -- it's "
        "meant as a first-line self-screening aid, not a clinical-grade test. "
        "Please treat a Moderate or High result as a prompt to talk to a "
        "qualified healthcare professional, not as a final answer.",
    ),
]

_DEFAULT_REPLY = (
    "I can help with using this site, general diabetes education, or "
    "explaining your own screening results in plain language. Could you "
    "tell me a bit more about what you'd like to know?"
)

_CLINICIAN_EXTRA = (
    " As a clinician, you can also expand 'Technical details' on a report "
    "to see the raw contribution values and model confidence."
)


def _sanitize(text: str) -> str:
    """Guarantee the non-negotiable copy rule even if a future model swap
    momentarily forgets it."""
    sanitized = text
    for pattern in _BANNED_PATTERNS:
        sanitized = re.sub(pattern, "risk estimate", sanitized, flags=re.IGNORECASE)
    return sanitized


def respond(message: str, mode: str = "patient", context_report_id: Optional[str] = None) -> str:
    """MOCK implementation: simple keyword-matched templated responses."""
    lowered = message.lower()
    reply = _DEFAULT_REPLY
    for keywords, canned in _FAQ:
        if any(kw in lowered for kw in keywords):
            reply = canned
            break

    if mode == "clinician":
        reply += _CLINICIAN_EXTRA

    return _sanitize(reply)
