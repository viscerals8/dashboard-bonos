from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    nombre_completo: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    query = text("""
        SELECT username, password, nombre_completo, perfil, empresas, zonas, rut
        FROM USUARIOS
        WHERE username = :username
    """)

    with engine.connect() as conn:
        user = conn.execute(query, {"username": body.username}).mappings().first()

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos",
        )

    token = create_access_token(
        user["username"], user["perfil"], user["empresas"], user["zonas"], user["rut"]
    )
    return LoginResponse(access_token=token, nombre_completo=user["nombre_completo"])
