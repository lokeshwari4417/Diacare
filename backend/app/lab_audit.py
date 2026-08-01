"""
Phase 9 Part B: Audit Logging Service & Public Token Rate Limiter.
Logs sensitive medical data access events and mitigates public token brute-force attempts.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Request
from sqlalchemy.orm import Session

from . import models

# In-memory Rate Limiting Storage: { token_or_ip: [timestamp1, timestamp2, ...] }
_RATE_LIMIT_STORE: Dict[str, list] = {}


def check_rate_limit(key: str, max_requests: int = 30, window_seconds: int = 60):
    """
    Enforces in-memory rate limiting (max N requests per window_seconds).
    Throws 429 Too Many Requests if limit is exceeded.
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(seconds=window_seconds)

    timestamps = _RATE_LIMIT_STORE.get(key, [])
    # Prune old timestamps
    timestamps = [t for t in timestamps if t > cutoff]

    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} requests per minute allowed.",
        )

    timestamps.append(now)
    _RATE_LIMIT_STORE[key] = timestamps


def log_action(
    db: Session,
    actor_type: str,  # "patient" | "doctor" | "system" | "public"
    actor_id: Optional[str],
    action: str,  # e.g. "view_report", "download_pdf", "create_share_link"
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """
    Writes a HIPAA-style audit trail record to the audit_logs table.
    Fails safely without raising exceptions to prevent disrupting business logic.
    """
    try:
        log_entry = models.AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[AuditLog Error] Failed to write audit log: {e}")


def get_patient_audit_logs(db: Session, patient_id: str, skip: int = 0, limit: int = 50):
    """
    Retrieves audit access history for data owned by patient_id.
    """
    logs = (
        db.query(models.AuditLog)
        .filter(
            ((models.AuditLog.target_type == "patient") & (models.AuditLog.target_id == patient_id)) |
            ((models.AuditLog.actor_type == "patient") & (models.AuditLog.actor_id == patient_id))
        )
        .order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    res = []
    for l in logs:
        res.append({
            "id": l.id,
            "actor_type": l.actor_type,
            "actor_id": l.actor_id,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "ip_address": l.ip_address,
        })
    return res
