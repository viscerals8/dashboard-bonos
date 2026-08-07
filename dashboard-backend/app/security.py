import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 8

bearer_scheme = HTTPBearer()

# "bcrypt" primero: cualquier hash con ese formato se verifica correctamente.
# "plaintext" como fallback cubre las cuentas demo (password guardado tal cual).
# Las 258 cuentas reales tienen un hash tipo SHA256 (64 chars hex, ver
# docs/CHECKLIST_PRODUCCION.md) que no está confirmado con certeza: en vez de
# adivinar el algoritmo y arriesgar un login que "funciona" con la comparación
# incorrecta, esas cuentas siguen fallando el login hasta confirmarlo. Una vez
# confirmado, agregar ese scheme a la lista de abajo.
pwd_context = CryptContext(schemes=["bcrypt", "plaintext"], deprecated=["plaintext"])


def verify_password(plain_password: str, stored_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, stored_password)
    except ValueError:
        return False


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


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
