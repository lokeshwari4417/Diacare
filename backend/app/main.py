"""
DiaCare backend entrypoint. Wires up all routers, CORS, and DB init.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine, Base
from .config import CORS_ORIGINS
from .auth import router as auth_router
from .users import router as users_router
from .patients import router as patients_router
from .misc import router as misc_router

from sqlalchemy import text

from .lab_routes import router as lab_router
from .lab_doctor_routes import router as doctor_portal_router
from .lab_notification_routes import router as notification_router

Base.metadata.create_all(bind=engine)




# Safe auto-migration for newly added User model columns
with engine.begin() as conn:
    is_postgres = "postgresql" in engine.dialect.name
    columns_to_add = [
        ("status", "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'" if is_postgres else "ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'"),
        ("otp_code", "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(20)" if is_postgres else "ALTER TABLE users ADD COLUMN otp_code VARCHAR(20)"),
        ("otp_expiry", "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP" if is_postgres else "ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP"),
        ("information", "ALTER TABLE users ADD COLUMN IF NOT EXISTS information TEXT" if is_postgres else "ALTER TABLE users ADD COLUMN information TEXT"),
    ]
    for col_name, stmt in columns_to_add:
        try:
            conn.execute(text(stmt))
        except Exception:
            pass
    try:
        conn.execute(text("UPDATE users SET status = 'active' WHERE status IS NULL"))
    except Exception:
        pass


app = FastAPI(
    title="DiaCare API",
    description=(
        "Multi-role diabetes risk screening & care coordination platform. "
        "This is a screening aid, not a diagnostic tool. See /health for status "
        "and the model card in the frontend for intended use and limitations."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(patients_router)
app.include_router(misc_router)
app.include_router(lab_router)
app.include_router(doctor_portal_router)
app.include_router(notification_router)





@app.get("/")
def root():
    return {"service": "DiaCare API", "docs": "/docs"}
