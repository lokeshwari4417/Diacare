def welcome_email_template(user_name: str):
    subject = "Welcome to DiaCare!"
    html = f"""
    <h2>Welcome, {user_name}!</h2>
    <p>Thank you for registering with DiaCare. We're excited to help you manage your health journey.</p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    """
    text = f"Welcome, {user_name}! Thank you for registering with DiaCare."
    return subject, html, text


def password_reset_template(user_name: str, reset_link: str):
    subject = "Reset Your DiaCare Password"
    html = f"""
    <h2>Password Reset Request</h2>
    <p>Hi {user_name},</p>
    <p>We received a request to reset your password. Click the link below to set a new password:</p>
    <p><a href="{reset_link}">Reset Password</a></p>
    <p>This link will expire in 30 minutes. If you did not request this, please ignore this email.</p>
    """
    text = f"Hi {user_name}, reset your password here: {reset_link}"
    return subject, html, text


def appointment_reminder_template(user_name: str, appointment_date: str, appointment_time: str, doctor_name: str = ""):
    subject = "Appointment Reminder - DiaCare"
    html = f"""
    <h2>Appointment Reminder</h2>
    <p>Hi {user_name},</p>
    <p>This is a reminder for your upcoming appointment:</p>
    <p><b>Date:</b> {appointment_date}<br>
    <b>Time:</b> {appointment_time}<br>
    {"<b>Doctor:</b> " + doctor_name if doctor_name else ""}</p>
    <p>Please make sure to arrive 10 minutes early.</p>
    """
    text = f"Hi {user_name}, reminder: appointment on {appointment_date} at {appointment_time}."
    return subject, html, text


def otp_verification_template(user_name: str, otp_code: str):
    subject = "Your DiaCare Verification Code"
    html = f"""
    <h2>Verification Code</h2>
    <p>Hi {user_name},</p>
    <p>Your One-Time Password (OTP) is:</p>
    <h1 style="letter-spacing: 5px;">{otp_code}</h1>
    <p>This code will expire in 10 minutes. Do not share this code with anyone.</p>
    """
    text = f"Hi {user_name}, your OTP is {otp_code}. It expires in 10 minutes."
    return subject, html, text


def account_approved_template(user_name: str, login_link: str):
    subject = "Your DiaCare Account Has Been Approved!"
    html = f"""
    <h2>Account Approved</h2>
    <p>Hi {user_name},</p>
    <p>Great news! Your account has been reviewed and approved by the administrator.</p>
    <p>You can now log in to the application. Your login will require a one-time verification code sent to your email.</p>
    <p><a href="{login_link}">Log In Now</a></p>
    """
    text = f"Hi {user_name}, your DiaCare account has been approved. Log in here: {login_link}"
    return subject, html, text