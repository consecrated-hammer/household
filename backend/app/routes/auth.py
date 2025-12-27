from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    CreateAccessToken,
    CreateRefreshToken,
    CreateRefreshTokenExpiry,
    HashPassword,
    VerifyPassword,
)
from app.deps import EnsureRefreshTokenActive, GetDb
from app.models import Household, RefreshToken, User
from app.schemas import RefreshRequest, TokenPair, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def Register(payload: UserRegister, db: Session = Depends(GetDb)) -> UserOut:
    existing = db.query(User).filter(User.Email == payload.Email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    household = Household(Name=payload.HouseholdName)
    db.add(household)
    db.flush()

    user = User(
        Email=payload.Email,
        PasswordHash=HashPassword(payload.Password),
        Role="Admin",
        HouseholdId=household.Id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(Id=user.Id, Email=user.Email, Role=user.Role, HouseholdId=user.HouseholdId)


@router.post("/login", response_model=TokenPair)
def Login(payload: UserLogin, db: Session = Depends(GetDb)) -> TokenPair:
    user = db.query(User).filter(User.Email == payload.Email).first()
    if not user or not VerifyPassword(payload.Password, user.PasswordHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    refresh_secret = CreateRefreshToken()
    refresh_record = RefreshToken(
        UserId=user.Id,
        TokenHash=HashPassword(refresh_secret),
        ExpiresAt=CreateRefreshTokenExpiry(),
    )
    db.add(refresh_record)
    db.commit()
    db.refresh(refresh_record)

    access = CreateAccessToken(str(user.Id), {"role": user.Role})
    refresh_token = f"{refresh_record.Id}.{refresh_secret}"
    return TokenPair(AccessToken=access, RefreshToken=refresh_token)


@router.post("/refresh", response_model=TokenPair)
def Refresh(payload: RefreshRequest, db: Session = Depends(GetDb)) -> TokenPair:
    try:
        token_id_str, refresh_secret = payload.RefreshToken.split(".", 1)
        token_id = int(token_id_str)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    record = db.query(RefreshToken).filter(RefreshToken.Id == token_id).first()
    if not record or not VerifyPassword(refresh_secret, record.TokenHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    EnsureRefreshTokenActive(record.ExpiresAt, record.RevokedAt)

    record.RevokedAt = datetime.utcnow()
    db.add(record)

    user = db.query(User).filter(User.Id == record.UserId).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_refresh_secret = CreateRefreshToken()
    new_refresh_record = RefreshToken(
        UserId=user.Id,
        TokenHash=HashPassword(new_refresh_secret),
        ExpiresAt=CreateRefreshTokenExpiry(),
    )
    db.add(new_refresh_record)
    db.commit()
    db.refresh(new_refresh_record)

    access = CreateAccessToken(str(user.Id), {"role": user.Role})
    refresh_token = f"{new_refresh_record.Id}.{new_refresh_secret}"
    return TokenPair(AccessToken=access, RefreshToken=refresh_token)
