import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("DIACARE_SMTP_HOST") or os.getenv("SMTP_HOST")
SMTP_PORT_RAW = os.getenv("DIACARE_SMTP_PORT") or os.getenv("SMTP_PORT")
SMTP_PORT = int(SMTP_PORT_RAW) if SMTP_PORT_RAW else 587
SMTP_USER = os.getenv("DIACARE_SMTP_USER") or os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("DIACARE_SMTP_PASSWORD") or os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("DIACARE_SMTP_FROM_EMAIL") or os.getenv("SMTP_FROM") or "no-reply@diacare.demo"
FROM_NAME = os.getenv("DIACARE_SMTP_FROM_NAME") or "DiaCare"



def send_email(to_email: str, subject: str, html_body: str, text_body: str = None):
    """
    Sends an email using the configured SMTP (Mailtrap sandbox for testing).
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
        return True, "Email sent successfully"
    except Exception as e:
        return False, str(e)