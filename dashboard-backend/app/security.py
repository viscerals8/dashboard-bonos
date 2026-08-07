import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 8

bearer_scheme = HTTPBearer()


def verify_password(plain_password: str, stored_password: str) -> bool:
    # USUARIOS.password todavia no esta hasheado (migracion pendiente, ver plan del MVP).
    return plain_password == stored_password


def _parse_id_list(csv_value: str | None) -> list[int]:
    if not csv_value:
        return []
    return [int(v) for v in csv_value.split(",") if v.strip().isdigit()]


def create_access_token(
    username: str, perfil: int, empresas: str | None, zonas: str | None, rut: str | None
) -> str:
    payload = {
        "sub": username,
        "perfil": perfil,
        "empresas": _parse_id_list(empresas),
        "zonas": _parse_id_list(zonas),
        "rut": rut,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
        )
