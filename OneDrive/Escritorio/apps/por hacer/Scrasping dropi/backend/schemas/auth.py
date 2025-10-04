from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    parts = email.split("@")
    if len(parts) != 2 or not parts[0] or not parts[1] or "." not in parts[1]:
        raise ValueError("Invalid email format")
    return email


class UserCreate(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    _validate_email = field_validator("email")(_normalize_email)


class UserLogin(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str

    _validate_email = field_validator("email")(_normalize_email)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: datetime


class UserPublic(BaseModel):
    id: int
    email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
