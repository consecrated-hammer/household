from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import secrets

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def HashPassword(password: str) -> str:
    return pwd_context.hash(password)


def VerifyPassword(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def CreateAccessToken(subject: str, extra_claims: Dict[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.AccessTokenTtlMinutes)
    to_encode = {"sub": subject, "exp": expire, **extra_claims}
    return jwt.encode(to_encode, settings.JwtSecretKey, algorithm=settings.JwtAlgorithm)


def CreateRefreshToken() -> str:
    return secrets.token_urlsafe(48)


def CreateRefreshTokenExpiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.RefreshTokenTtlDays)
