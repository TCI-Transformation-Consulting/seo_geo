from __future__ import annotations

import os
import time
from typing import Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr
import jwt
from passlib.hash import pbkdf2_sha256 as hasher

# Simple in-memory user store seeded at startup (no DB).
# In production, replace with a persistent database.
_users: Dict[str, str] = {}  # email -> bcrypt hash

JWT_SECRET = os.getenv("AUTH_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRE_SECONDS = int(os.getenv("AUTH_EXPIRE_SECONDS", "604800"))  # default 7 days


def _hash_password(password: str) -> str:
    return hasher.hash(password)


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return hasher.verify(password, hashed)
    except Exception:
        return False


def seed_users() -> None:
    """
    Seed initial users with the same password 'testuser123' (bcrypt-hashed).
    """
    global _users
    if _users:
        return  # already seeded

    initial_password = os.getenv("SEED_PASSWORD", "testuser123")
    emails = [
        "oleg.seifert@tci-partners.com",
        "mw@neuewerte.de",
        "db@neuewerte.de",
    ]
    for email in emails:
        _users[email.lower()] = _hash_password(initial_password)


seed_users()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def create_access_token(email: str, expires_in: int = JWT_EXPIRE_SECONDS) -> str:
    now = int(time.time())
    payload = {
        "sub": email,
        "iat": now,
        "exp": now + expires_in,
        "scope": "user",
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    # pyjwt >= 2 returns str
    return token


def require_auth(authorization: Optional[str] = Header(default=None)) -> str:
    """
    FastAPI dependency that validates a Bearer token and returns the user's email.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = parts[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
        if not email or email.lower() not in _users:
            raise HTTPException(status_code=401, detail="User not found")
        return email.lower()
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest) -> TokenResponse:
    email = req.email.lower()
    hashed = _users.get(email)
    if not hashed or not _verify_password(req.password, hashed):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(email)
    return TokenResponse(access_token=token, expires_in=JWT_EXPIRE_SECONDS)
