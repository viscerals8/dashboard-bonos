import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.catalog import router as catalog_router
from app.dashboard import router as dashboard_router

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="Dashboard Backend")

# En produccion, definir ALLOWED_ORIGINS en .env con el/los dominio(s) reales
# del frontend, separados por coma (ej: "https://bonos.miempresa.cl"). Sin esa
# variable, se usa el regex permisivo de desarrollo (cualquier puerto local).
_allowed_origins = os.environ.get("ALLOWED_ORIGINS")

if _allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in _allowed_origins.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1|\[::1\]):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(dashboard_router)

@app.get("/")
def root():
    return {"status": "ok"}
