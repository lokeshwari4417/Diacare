"""
Profile + Admin user-management routes (Section 3.4 / shared Profile section).
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db
from .auth import get_current_user, require_roles
from .security import hash_password

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=schemas.UserOut)
def read_me(user: models.User = Depends(get_current_user)):
    return user


@router.patch("/users/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate, db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin")),
):
    return db.query(models.User).all()


@router.patch("/users/{user_id}/deactivate", response_model=schemas.UserOut)
def deactivate_user(
    user_id: str, db: Session = Depends(get_db),
    admin: models.User = Depends(require_roles("admin")),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = False
    db.commit()
    db.refresh(target)
    return target


@router.patch("/users/{user_id}/reactivate", response_model=schemas.UserOut)
def reactivate_user(
    user_id: str, db: Session = Depends(get_db),
    admin: models.User = Depends(require_roles("admin")),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = True
    db.commit()
    db.refresh(target)
    return target


@router.post("/users", response_model=schemas.UserOut)
def admin_create_user(
    payload: schemas.UserRegister,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_roles("admin")),
):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    user = models.User(
        name=payload.name,
        email=payload.email,
        mobile=payload.mobile,
        hashed_password=hash_password(payload.password),
        role=models.RoleEnum(payload.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset")
def admin_reset_user_password(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_roles("admin")),
):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    temp_password = str(uuid.uuid4())[:8]
    target.hashed_password = hash_password(temp_password)
    db.commit()
    return {"temp_password": temp_password}


@router.get("/admin/stats", response_model=schemas.AdminStats)
def admin_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_roles("admin")),
):
    users = db.query(models.User).all()
    reports = db.query(models.Report).all()
    distribution = {"low": 0, "moderate": 0, "high": 0}
    for r in reports:
        distribution[r.risk_band] = distribution.get(r.risk_band, 0) + 1
    return schemas.AdminStats(
        total_users=len(users),
        total_patients=sum(1 for u in users if u.role == models.RoleEnum.patient),
        total_doctors=sum(1 for u in users if u.role == models.RoleEnum.doctor),
        total_ngo_workers=sum(1 for u in users if u.role == models.RoleEnum.ngo),
        total_screenings=len(reports),
        risk_band_distribution=distribution,
    )
