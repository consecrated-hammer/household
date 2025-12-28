from datetime import datetime
import json
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core.security import (
    CreateAccessToken,
    CreateRefreshToken,
    CreateRefreshTokenExpiry,
    HashPassword,
    VerifyPassword,
)
from app.core.config import settings
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

    return IssueTokenPair(user, db)


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

    return IssueTokenPair(user, db)


@router.get("/authelia", response_model=TokenPair)
def AutheliaLogin(request: Request, db: Session = Depends(GetDb)) -> TokenPair:
    if not settings.AutheliaEnabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Authelia login disabled"
        )

    email = request.headers.get(settings.AutheliaHeaderEmail)
    if not email:
        candidate = request.headers.get(settings.AutheliaHeaderUser)
        if candidate:
            if "@" in candidate:
                email = candidate
            elif settings.AutheliaFallbackDomain:
                email = f"{candidate}@{settings.AutheliaFallbackDomain}"

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authelia identity headers not found",
        )

    user = db.query(User).filter(User.Email == email).first()
    if not user:
        household = db.query(Household).order_by(Household.Id.asc()).first()
        if not household:
            household = Household(Name="Household")
            db.add(household)
            db.flush()
            role = "Admin"
        else:
            role = "User"
        user = User(
            Email=email,
            PasswordHash=HashPassword(CreateRefreshToken()),
            Role=role,
            HouseholdId=household.Id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    tokens = IssueTokenPair(user, db)
    token_payload = {"AccessToken": tokens.AccessToken, "RefreshToken": tokens.RefreshToken}
    return_to = request.query_params.get("returnTo")
    if return_to:
        safe_target = "/income"
        if return_to.startswith("/"):
            safe_target = return_to
        else:
            parsed = urlparse(return_to)
            host = request.headers.get("host", "")
            if parsed.netloc == host:
                safe_target = return_to
        payload = json.dumps(token_payload)
        html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="cache-control" content="no-store" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in…</title>
  </head>
  <body>
    <script>
      const tokenData = {payload};
      localStorage.setItem('budgetTokens', JSON.stringify(tokenData));
      window.location.replace({json.dumps(safe_target)});
    </script>
  </body>
</html>"""
        return HTMLResponse(html, headers={"Cache-Control": "no-store"})

    return tokens


def IssueTokenPair(user: User, db: Session) -> TokenPair:
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
