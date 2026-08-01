"""
Separate minimal authentication for Doctor Portal accounts.
Uses JWT tokens specifically scoped for DoctorAccount users.
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from . import models

SECRET_KEY = os.getenv("DIACARE_SECRET_KEY", "diacare_super_secret_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_doctor_scheme = OAuth2PasswordBearer(tokenUrl="/v1/doctors/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_doctor_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "role": "doctor_portal"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_doctor(token: str = Depends(oauth2_doctor_scheme), db: Session = Depends(get_db)) -> models.DoctorAccount:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate doctor credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        doctor_id: str = payload.get("sub")
        role: str = payload.get("role")
        if doctor_id is None or role != "doctor_portal":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    doctor = db.query(models.DoctorAccount).filter(models.DoctorAccount.id == doctor_id).first()
    if doctor is None:
        raise credentials_exception
    return doctor
