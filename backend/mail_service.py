import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

SMTP_HOST = os.getenv("DIACARE_SMTP_HOST")
SMTP_PORT = int(os.getenv("DIACARE_SMTP_PORT", 587))
SMTP_USER = os.getenv("DIACARE_SMTP_USER")
SMTP_PASSWORD = os.getenv("DIACARE_SMTP_PASSWORD")
FROM_EMAIL = os.getenv("DIACARE_SMTP_FROM_EMAIL", "no-reply@diacare.demo")
FROM_NAME = os.getenv("DIACARE_SMTP_FROM_NAME", "DiaCare")


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