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

Base.metadata.create_all(bind=engine)

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


@app.get("/")
def root():
    return {"service": "DiaCare API", "docs": "/docs"}
