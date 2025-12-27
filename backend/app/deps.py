from datetime import datetime, timezone
import logging
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import SessionLocal
from app.models import User

security = HTTPBearer()
logger = logging.getLogger("auth")


def GetDb() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def GetCurrentUser(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(GetDb),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JwtSecretKey, algorithms=[settings.JwtAlgorithm])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.Id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def RequireAuthenticated(user: User = Depends(GetCurrentUser)) -> User:
    return user


def RequireRoleAdmin(user: User = Depends(GetCurrentUser)) -> User:
    if user.Role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user


def RequireCanReadHousehold(household_id: int, user: User) -> None:
    if user.Role == "Admin":
        return
    if user.HouseholdId != household_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


def RequireCanWriteHousehold(household_id: int, user: User) -> None:
    if user.Role == "Admin":
        return
    if user.Role == "ReadOnly":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Read only")
    if user.HouseholdId != household_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


def EnsureRefreshTokenActive(expires_at: datetime, revoked_at: datetime | None) -> None:
    if revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
