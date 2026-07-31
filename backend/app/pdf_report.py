"""
One-page PDF report generation (Section 5.5), built with reportlab.
"""
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .config import DISCLAIMER_TEXT

_RISK_COLORS = {"low": colors.HexColor("#3E8E5C"), "moderate": colors.HexColor("#D98E2C"),
                 "high": colors.HexColor("#C75450")}


def build_pdf(report: dict) -> bytes:
    """
    report: {
        patient_name, generated_at, inputs: dict, probability, risk_band,
        summary, top_factors: [ {feature, direction, caption} ],
        reference_comparison: [ {feature, value, low, high, unit, status} ],
    }
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], textColor=colors.HexColor("#1E3A8A"))
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=colors.HexColor("#1E3A8A"), spaceBefore=10)
    body = styles["BodyText"]
    small = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=8, textColor=colors.HexColor("#555555"))

    story = []
    story.append(Paragraph("DiaCare -- Diabetes Risk Screening Report", title_style))
    story.append(Paragraph(f"Generated: {report.get('generated_at', datetime.utcnow().isoformat())}", small))
    story.append(Spacer(1, 4 * mm))

    # Disclaimer banner
    disclaimer_style = ParagraphStyle(
        "Disclaimer", parent=body, backColor=colors.HexColor("#EFF6FF"),
        borderColor=colors.HexColor("#3B82F6"), borderWidth=1, borderPadding=6,
    )
    story.append(Paragraph(f"<b>Important:</b> {DISCLAIMER_TEXT}", disclaimer_style))
    story.append(Spacer(1, 4 * mm))

    band = report["risk_band"]
    prob_pct = round(report["probability"] * 100, 1)
    band_hex = {"low": "#3E8E5C", "moderate": "#D98E2C", "high": "#C75450"}.get(band, "#333333")
    story.append(Paragraph("Risk Classification", h2))
    story.append(Paragraph(
        f"<b><font color='{band_hex}'>{band.upper()} RISK</font></b> "
        f"— estimated probability: {prob_pct}%",
        body,
    ))
    if report.get("summary"):
        story.append(Paragraph(report["summary"], body))
    story.append(Spacer(1, 3 * mm))

    # Inputs table
    story.append(Paragraph("Submitted Values", h2))
    input_rows = [["Field", "Value"]]
    field_labels = {
        "pregnancies": "Pregnancies", "glucose": "Glucose (mg/dL)",
        "blood_pressure": "Blood Pressure (mm Hg)", "skin_thickness": "Skin Thickness (mm)",
        "insulin": "Insulin (mu U/mL)", "bmi": "BMI (kg/m\u00b2)",
        "diabetes_pedigree_function": "Diabetes Pedigree Function", "age": "Age (years)",
    }
    for key, label in field_labels.items():
        input_rows.append([label, str(report["inputs"].get(key, "-"))])
    input_table = Table(input_rows, colWidths=[90 * mm, 60 * mm])
    input_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(input_table)
    story.append(Spacer(1, 4 * mm))

    # Top contributing factors
    story.append(Paragraph("Top Contributing Factors", h2))
    for factor in report.get("top_factors", [])[:5]:
        story.append(Paragraph(f"\u2022 {factor['caption']}", body))
    story.append(Spacer(1, 3 * mm))

    # Reference ranges
    story.append(Paragraph("Reference Range Comparison", h2))
    ref_rows = [["Field", "Your Value", "General Reference Range", "Status", "Source Citation"]]
    for item in report.get("reference_comparison", []):
        ref_rows.append([
            item["feature"], f"{item['value']} {item['unit']}",
            f"{item['low']}\u2013{item['high']} {item['unit']}",
            item["status"].replace("_", " "),
            item["source"],
        ])
    ref_table = Table(ref_rows, colWidths=[34 * mm, 24 * mm, 34 * mm, 22 * mm, 60 * mm])
    ref_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    story.append(ref_table)
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "Reference ranges reflect general population guidance (WHO/ADA-style) "
        "and are not individualized clinical thresholds.", small,
    ))

    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#CCCCCC")))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "This is a screening aid, not a diagnosis. Please share this report "
        "with a licensed healthcare provider.",
        small,
    ))

    doc.build(story)
    return buffer.getvalue()
