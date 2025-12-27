from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import GetDb, RequireAuthenticated, RequireCanReadHousehold, RequireCanWriteHousehold
from app.models import TablePreference, User
from app.schemas import TablePreferenceOut, TablePreferenceUpdate

router = APIRouter(prefix="/table-preferences", tags=["table-preferences"])


@router.get("/{table_key}", response_model=TablePreferenceOut)
def GetTablePreference(
    table_key: str,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> TablePreferenceOut:
    RequireCanReadHousehold(user.HouseholdId, user)
    pref = (
        db.query(TablePreference)
        .filter(TablePreference.UserId == user.Id, TablePreference.TableKey == table_key)
        .first()
    )
    if not pref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preference not found")
    return pref


@router.put("/{table_key}", response_model=TablePreferenceOut)
def UpsertTablePreference(
    table_key: str,
    payload: TablePreferenceUpdate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> TablePreferenceOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    if payload.TableKey != table_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Table key mismatch")
    pref = (
        db.query(TablePreference)
        .filter(TablePreference.UserId == user.Id, TablePreference.TableKey == table_key)
        .first()
    )
    now = datetime.utcnow()
    if not pref:
        pref = TablePreference(
            HouseholdId=user.HouseholdId,
            UserId=user.Id,
            TableKey=table_key,
            State=payload.State,
            CreatedAt=now,
            UpdatedAt=now,
        )
        db.add(pref)
    else:
        pref.State = payload.State
        pref.UpdatedAt = now
    db.commit()
    db.refresh(pref)
    return pref
