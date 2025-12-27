from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import GetDb, RequireAuthenticated, RequireCanReadHousehold, RequireCanWriteHousehold
from app.models import Expense, ExpenseType, User
from app.schemas import ExpenseTypeCreate, ExpenseTypeOut, ExpenseTypeUpdate

router = APIRouter(prefix="/expense-types", tags=["expense-types"])


@router.get("", response_model=list[ExpenseTypeOut])
def ListExpenseTypes(
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> list[ExpenseTypeOut]:
    RequireCanReadHousehold(user.HouseholdId, user)
    types = (
        db.query(ExpenseType)
        .filter(ExpenseType.HouseholdId == user.HouseholdId)
        .order_by(ExpenseType.Name.asc())
        .all()
    )
    return [
        ExpenseTypeOut(
            Id=entry.Id,
            HouseholdId=entry.HouseholdId,
            OwnerUserId=entry.OwnerUserId,
            Name=entry.Name,
            Enabled=entry.Enabled,
            CreatedAt=entry.CreatedAt,
        )
        for entry in types
    ]


@router.post("", response_model=ExpenseTypeOut, status_code=status.HTTP_201_CREATED)
def CreateExpenseType(
    payload: ExpenseTypeCreate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> ExpenseTypeOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    entry = ExpenseType(
        HouseholdId=user.HouseholdId,
        OwnerUserId=user.Id,
        Name=payload.Name,
        Enabled=payload.Enabled,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return ExpenseTypeOut(
        Id=entry.Id,
        HouseholdId=entry.HouseholdId,
        OwnerUserId=entry.OwnerUserId,
        Name=entry.Name,
        Enabled=entry.Enabled,
        CreatedAt=entry.CreatedAt,
    )


@router.put("/{type_id}", response_model=ExpenseTypeOut)
def UpdateExpenseType(
    type_id: int,
    payload: ExpenseTypeUpdate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> ExpenseTypeOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    entry = (
        db.query(ExpenseType)
        .filter(ExpenseType.Id == type_id, ExpenseType.HouseholdId == user.HouseholdId)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Type not found")

    old_name = entry.Name
    entry.Name = payload.Name
    entry.Enabled = payload.Enabled
    if old_name != payload.Name:
        db.query(Expense).filter(
            Expense.HouseholdId == user.HouseholdId, Expense.Type == old_name
        ).update({Expense.Type: payload.Name})
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return ExpenseTypeOut(
        Id=entry.Id,
        HouseholdId=entry.HouseholdId,
        OwnerUserId=entry.OwnerUserId,
        Name=entry.Name,
        Enabled=entry.Enabled,
        CreatedAt=entry.CreatedAt,
    )


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def DeleteExpenseType(
    type_id: int,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> None:
    RequireCanWriteHousehold(user.HouseholdId, user)
    entry = (
        db.query(ExpenseType)
        .filter(ExpenseType.Id == type_id, ExpenseType.HouseholdId == user.HouseholdId)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Type not found")
    in_use = (
        db.query(Expense)
        .filter(Expense.HouseholdId == user.HouseholdId, Expense.Type == entry.Name)
        .first()
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type is used by an expense",
        )
    db.delete(entry)
    db.commit()
