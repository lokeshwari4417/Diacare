"""
Auth routes + role-based access control (RBAC) dependencies.

RBAC is enforced server-side here (Section 9: "Role-based access control
enforced server-side on every endpoint, not just hidden in the UI").
"""
import uuid
import os
import random
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db
from .security import hash_password, verify_password, create_access_token, decode_access_token
from .mail_service import send_email, send_otp_email
from .email_templates import welcome_email_template, password_reset_template, otp_verification_template


router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

# In-memory stores for reset & OTP tokens.
_RESET_TOKENS = {}
_OTP_TOKENS = {}


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == payload["sub"]).first()
    if not user or not user.is_active or user.status != "active":
        raise credentials_exception
    return user


def require_roles(*roles: str):
    def dependency(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(roles)}",
            )
        return user
    return dependency


@router.post("/register")
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if payload.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot register as an admin")

    status_val = "active" if payload.role == "patient" else "pending"

    user = models.User(
        name=payload.name,
        email=payload.email,
        mobile=payload.mobile,
        hashed_password=hash_password(payload.password),
        role=models.RoleEnum(payload.role),
        status=status_val,
        information=payload.information,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if payload.role == "patient":
        try:
            subject, html, text = welcome_email_template(user.name)
            send_email(user.email, subject, html, text)
        except Exception as e:
            print(f"Failed to send welcome email: {e}")

        token = create_access_token({"sub": user.id, "role": user.role.value})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": schemas.UserOut.model_validate(user),
            "status": "active"
        }
    else:
        try:
            subject = "DiaCare Registration Received"
            html = f"<h2>Registration Received</h2><p>Hi {user.name}, your registration is pending admin approval.</p>"
            send_email(user.email, subject, html, html)
        except Exception as e:
            print(f"Failed to send registration received email: {e}")

        return {
            "detail": "Your registration was successful and is pending admin approval.",
            "status": "pending"
        }


@router.post("/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if user.status == "pending":
        raise HTTPException(status_code=403, detail="Your account is pending admin approval.")
    if user.status == "rejected":
        raise HTTPException(status_code=403, detail="Your account access request has been rejected.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")

    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    try:
        send_otp_email(user.email, otp_code)
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        
    return {
        "detail": "OTP sent to your email",
        "email": user.email,
        "requires_otp": True,
        "demo_otp": otp_code
    }



@router.post("/logout")
def logout(user: models.User = Depends(get_current_user)):
    return {"detail": "Logged out"}


@router.post("/forgot-password")
def forgot_password(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        reset_token = str(uuid.uuid4())
        _RESET_TOKENS[payload.email] = reset_token
        
        frontend_url = os.getenv("DIACARE_FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/forgot-password?token={reset_token}&email={user.email}"
        
        try:
            subject, html, text = password_reset_template(user.name, reset_link)
            send_email(user.email, subject, html, text)
        except Exception as e:
            print(f"Failed to send reset email: {e}")
            
        return {"detail": "Reset token issued", "demo_reset_token": reset_token}
    return {"detail": "If that email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(payload: schemas.PasswordReset, db: Session = Depends(get_db)):
    expected = _RESET_TOKENS.get(payload.email)
    if not expected or expected != payload.reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    del _RESET_TOKENS[payload.email]
    return {"detail": "Password updated"}


@router.post("/change-password")
def change_password(
    payload: schemas.PasswordChange,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"detail": "Password updated"}


@router.post("/send-otp")
def send_otp(payload: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    try:
        send_otp_email(payload.email, otp_code)
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        
    return {"detail": "OTP sent successfully", "demo_otp": otp_code}



@router.post("/verify-otp")
def verify_otp(payload: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.otp_code or not user.otp_expiry:
        raise HTTPException(status_code=400, detail="No OTP code has been generated")
        
    if user.otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    if user.otp_code != payload.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    user.otp_code = None
    user.otp_expiry = None
    db.commit()
    
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": schemas.UserOut.model_validate(user)
    }


@router.post("/resend-otp")
def resend_otp(payload: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.otp_expiry and (user.otp_expiry - datetime.utcnow()) > timedelta(minutes=9):
        seconds_passed = 600 - (user.otp_expiry - datetime.utcnow()).total_seconds()
        wait_seconds = int(60 - seconds_passed)
        if wait_seconds > 0:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait_seconds} seconds before requesting a new OTP."
            )
            
    otp_code = f"{random.randint(100000, 999999)}"
    user.otp_code = otp_code
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    
    try:
        send_otp_email(payload.email, otp_code)
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        
    return {
        "detail": "OTP resent successfully",
        "email": user.email,
        "demo_otp": otp_code
    }


