from __future__ import annotations

import hmac
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict

import jwt
from jwt import InvalidTokenError

from .config import settings

_PBKDF2_ITERATIONS = 390_000
_SALT_BYTES = 16


def get_password_hash(password: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"{_PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        iterations_str, salt_hex, hash_hex = hashed_password.split("$")
        iterations = int(iterations_str)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
    except (ValueError, TypeError):
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(candidate, expected_hash)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expire_minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


__all__ = [
    "InvalidTokenError",
    "create_access_token",
    "decode_access_token",
    "get_password_hash",
    "verify_password",
]
