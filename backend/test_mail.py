from dotenv import load_dotenv
load_dotenv()

from mail_service import send_email

success, message = send_email(
    to_email="loki194417@gmail.com",
    subject="DiaCare Test Email",
    html_body="<h2>Test</h2><p>This is a test email from DiaCare backend.</p>",
    text_body="This is a test email from DiaCare backend."
)

print(success, message)