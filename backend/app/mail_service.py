import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import resend

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM") or os.getenv("DIACARE_SMTP_FROM_EMAIL") or os.getenv("SMTP_FROM") or "onboarding@resend.dev"

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def send_otp_email(to_email: str, otp_code: str):
    """
    Sends an OTP verification code via Resend API (or SMTP fallback).
    """
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        resend.api_key = resend_key
        try:
            resend.Emails.send({
                "from": os.getenv("EMAIL_FROM", "onboarding@resend.dev"),
                "to": to_email,
                "subject": "Your DiaCare verification code",
                "html": f"<p>Your OTP code is <strong>{otp_code}</strong>. It expires in 10 minutes.</p>",
            })
            return True, "OTP email sent via Resend"
        except Exception as e:
            print(f"Failed to send OTP email via Resend: {e}")
            raise e
    else:
        subject = "Your DiaCare verification code"
        html = f"<p>Your OTP code is <strong>{otp_code}</strong>. It expires in 10 minutes.</p>"
        return send_email(to_email, subject, html)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """
    Sends an email using Resend API if RESEND_API_KEY is configured,
    or falls back to standard SMTP.
    """
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        resend.api_key = resend_key
        try:
            resend.Emails.send({
                "from": os.getenv("EMAIL_FROM", "onboarding@resend.dev"),
                "to": to_email,
                "subject": subject,
                "html": html_body,
            })
            return True, "Email sent via Resend"
        except Exception as e:
            print(f"Failed to send email via Resend: {e}")
            return False, str(e)

    # Standard SMTP Fallback
    SMTP_HOST = os.getenv("DIACARE_SMTP_HOST") or os.getenv("SMTP_HOST")
    if not SMTP_HOST:
        print("No email provider configured (RESEND_API_KEY or SMTP_HOST missing). Skipping email dispatch.")
        return False, "No email configuration found"

    SMTP_PORT_RAW = os.getenv("DIACARE_SMTP_PORT") or os.getenv("SMTP_PORT")
    SMTP_PORT = int(SMTP_PORT_RAW) if SMTP_PORT_RAW else 587
    SMTP_USER = os.getenv("DIACARE_SMTP_USER") or os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("DIACARE_SMTP_PASSWORD") or os.getenv("SMTP_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"DiaCare <{EMAIL_FROM}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, [to_email], msg.as_string())
        return True, "Email sent successfully via SMTP"
    except Exception as e:
        print(f"Failed to send email via SMTP: {e}")
        return False, str(e)