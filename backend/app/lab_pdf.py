"""
PDF Generation Engine for Single Lab Reports and Multi-Report Patient Summaries.
Uses ReportLab to generate clean, printable, grayscale-ready PDF documents with explicit status labels and disclaimers.
"""
from io import BytesIO
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from sqlalchemy.orm import Session

from . import models
from .lab_trends import get_patient_lab_summary, get_risk_flag_history

DISCLAIMER_TEXT = (
    "DISCLAIMER: This AI system is designed to assist in interpreting laboratory reports and providing "
    "educational insights. It does not replace professional medical advice, diagnosis, or treatment. "
    "Always consult a qualified healthcare professional for medical decisions."
)


def generate_report_pdf(db: Session, report_id: str) -> BytesIO:
    """Generates a clean PDF document for a single lab report."""
    report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not report:
        raise ValueError("Report not found")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica-Bold',
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
    )
    section_heading = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        fontName='Helvetica-Bold',
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1e293b'),
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#78350f'),
    )

    elements = []

    # 1. Header & Branding
    elements.append(Paragraph("DiaCare — Laboratory Analysis Report", title_style))
    patient_name = report.patient.name if report.patient else report.patient_id
    sub_text = f"Patient: <b>{patient_name}</b> | Facility: <b>{report.lab_name or 'N/A'}</b> | Date: <b>{report.report_date}</b>"
    elements.append(Paragraph(sub_text, subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))

    # 2. Risk Flags Section (if any)
    if report.risk_flags and len(report.risk_flags) > 0:
        elements.append(Paragraph("Identified Health Patterns & Risk Flags", section_heading))
        flag_data = [[Paragraph("Condition Pattern", table_cell_bold), Paragraph("Likelihood", table_cell_bold), Paragraph("Rationale", table_cell_bold)]]
        for rf in report.risk_flags:
            flag_data.append([
                Paragraph(f"<b>{rf.condition_name}</b>", table_cell),
                Paragraph(f"<b>{rf.likelihood_enum.upper()}</b>", table_cell),
                Paragraph(rf.rationale_text, table_cell),
            ])
        flag_table = Table(flag_data, colWidths=[150, 90, 290])
        flag_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fee2e2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#991b1b')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fca5a5')),
        ]))
        elements.append(flag_table)
        elements.append(Spacer(1, 10))

    # 3. Test Results Table
    elements.append(Paragraph("Laboratory Test Panel Results", section_heading))
    table_data = [[
        Paragraph("Category", table_cell_bold),
        Paragraph("Test Name", table_cell_bold),
        Paragraph("Value", table_cell_bold),
        Paragraph("Ref Range", table_cell_bold),
        Paragraph("Status", table_cell_bold),
    ]]

    for tr in report.test_results:
        ref_str = f"{tr.ref_low} - {tr.ref_high} {tr.unit}" if (tr.ref_low is not None and tr.ref_high is not None) else "Standard"
        status_label = f"[{tr.status_enum.upper()}]"
        table_data.append([
            Paragraph(tr.category, table_cell),
            Paragraph(f"<b>{tr.test_name_normalized}</b>", table_cell),
            Paragraph(f"<b>{tr.value_numeric}</b> {tr.unit}", table_cell),
            Paragraph(ref_str, table_cell),
            Paragraph(f"<b>{status_label}</b>", table_cell),
        ])

    res_table = Table(table_data, colWidths=[110, 140, 90, 110, 80])
    res_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(res_table)
    elements.append(Spacer(1, 10))

    # 4. Interpretations
    elements.append(Paragraph("Plain Language Explanations", section_heading))
    for tr in report.test_results:
        if tr.interpretation:
            txt = f"<b>{tr.test_name_normalized} ({tr.value_numeric} {tr.unit}):</b> {tr.interpretation.plain_language_explanation}"
            elements.append(Paragraph(txt, body_style))
            elements.append(Spacer(1, 3))

    elements.append(Spacer(1, 6))

    # 5. Recommendations
    if report.recommendations and len(report.recommendations) > 0:
        elements.append(Paragraph("Lifestyle & Clinical Recommendations", section_heading))
        for rec in report.recommendations:
            txt = f"• <b>[{rec.category.upper()}]</b> {rec.text}"
            elements.append(Paragraph(txt, body_style))
            elements.append(Spacer(1, 2.5))
        elements.append(Spacer(1, 10))

    # 6. Footer & Medical Disclaimer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    elements.append(Paragraph(f"<b>Medical Disclaimer:</b> {DISCLAIMER_TEXT}", disclaimer_style))
    elements.append(Spacer(1, 4))
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    elements.append(Paragraph(f"Generated by DiaCare Platform on {timestamp_str} | Official Document", subtitle_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def generate_summary_pdf(db: Session, patient_id: str) -> BytesIO:
    """Generates a multi-report summary PDF for a patient covering trends and latest status."""
    patient = db.query(models.User).filter(models.User.id == patient_id).first()
    patient_name = patient.name if patient else patient_id

    summary = get_patient_lab_summary(db, patient_id)
    risk_history = get_risk_flag_history(db, patient_id)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontSize=18, leading=22, textColor=colors.HexColor('#0f172a'), fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSub', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.HexColor('#475569')
    )
    section_heading = ParagraphStyle(
        'SectionHead', parent=styles['Heading2'], fontSize=11, leading=15, textColor=colors.HexColor('#1e293b'), fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=3
    )
    table_cell = ParagraphStyle('TableCell', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.HexColor('#1e293b'))
    table_cell_bold = ParagraphStyle('TableCellBold', parent=table_cell, fontName='Helvetica-Bold')
    disclaimer_style = ParagraphStyle('Disclaimer', parent=styles['Normal'], fontSize=7.5, leading=10, textColor=colors.HexColor('#78350f'))

    elements = []

    elements.append(Paragraph("DiaCare — Patient Comprehensive Lab Summary", title_style))
    elements.append(Paragraph(f"Patient: <b>{patient_name}</b> | Cumulative Health Summary Document", subtitle_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))

    # Summary Table
    elements.append(Paragraph("Latest Recorded Status per Lab Test", section_heading))
    table_data = [[
        Paragraph("Test Name", table_cell_bold),
        Paragraph("Category", table_cell_bold),
        Paragraph("Latest Value", table_cell_bold),
        Paragraph("Status", table_cell_bold),
        Paragraph("Trend", table_cell_bold),
        Paragraph("Latest Date", table_cell_bold),
    ]]

    for item in summary:
        table_data.append([
            Paragraph(f"<b>{item['test_name_normalized']}</b>", table_cell),
            Paragraph(item['category'], table_cell),
            Paragraph(f"<b>{item['latest_value']}</b> {item['unit']}", table_cell),
            Paragraph(f"<b>[{item['latest_status'].upper()}]</b>", table_cell),
            Paragraph(item['direction'].upper(), table_cell),
            Paragraph(item['latest_date'], table_cell),
        ])

    sum_table = Table(table_data, colWidths=[120, 100, 90, 80, 70, 70])
    sum_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(sum_table)
    elements.append(Spacer(1, 10))

    # Risk Flag History
    if risk_history:
        elements.append(Paragraph("Historical Risk Flag Timeline", section_heading))
        rf_data = [[Paragraph("Date", table_cell_bold), Paragraph("Condition Pattern", table_cell_bold), Paragraph("Likelihood", table_cell_bold), Paragraph("Rationale", table_cell_bold)]]
        for rf in risk_history:
            rf_data.append([
                Paragraph(rf['report_date'], table_cell),
                Paragraph(f"<b>{rf['condition_name']}</b>", table_cell),
                Paragraph(rf['likelihood_enum'].upper(), table_cell),
                Paragraph(rf['rationale_text'], table_cell),
            ])
        rf_table = Table(rf_data, colWidths=[65, 140, 75, 250])
        rf_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fef3c7')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fde68a')),
        ]))
        elements.append(rf_table)
        elements.append(Spacer(1, 10))

    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=6))
    elements.append(Paragraph(f"<b>Medical Disclaimer:</b> {DISCLAIMER_TEXT}", disclaimer_style))
    elements.append(Spacer(1, 4))
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    elements.append(Paragraph(f"Generated by DiaCare Platform on {timestamp_str}", subtitle_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
