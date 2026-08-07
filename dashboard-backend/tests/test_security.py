import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.security import (
    _parse_id_list,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)


def test_verify_password_demo_account_plaintext():
    # Las cuentas demo guardan el password tal cual, sin hashear.
    assert verify_password("Demo2026!", "Demo2026!") is True


def test_verify_password_wrong_plaintext():
    assert verify_password("incorrecta", "Demo2026!") is False


def test_verify_password_legacy_hash_fails_on_purpose():
    # Las cuentas reales tienen un hash tipo SHA256 (64 chars hex) cuyo algoritmo
    # exacto no esta confirmado (ver docs/CHECKLIST_PRODUCCION.md). No se adivina:
    # debe fallar en vez de compararse como si fuera texto plano.
    legacy_hash = "a" * 64
    assert verify_password("cualquier_password", legacy_hash) is False


def test_hash_password_roundtrip_with_bcrypt():
    hashed = hash_password("una_password_nueva")
    assert hashed != "una_password_nueva"
    assert verify_password("una_password_nueva", hashed) is True
    assert verify_password("otra_password", hashed) is False


@pytest.mark.parametrize(
    "raw,expected",
    [
        (None, []),
        ("", []),
        ("1,2,3", [1, 2, 3]),
        ("1, 2,  3", [1, 2, 3]),
        ("1,,3", [1, 3]),
    ],
)
def test_parse_id_list(raw, expected):
    assert _parse_id_list(raw) == expected


def test_create_access_token_and_get_current_user_roundtrip():
    token = create_access_token(
        username="jperez", perfil=1, empresas="1,2", zonas="4", rut="12345678-9"
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    payload = get_current_user(credentials)

    assert payload["sub"] == "jperez"
    assert payload["perfil"] == 1
    assert payload["empresas"] == [1, 2]
    assert payload["zonas"] == [4]
    assert payload["rut"] == "12345678-9"


def test_get_current_user_rejects_invalid_token():
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token-invalido")

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials)

    assert exc_info.value.status_code == 401
