from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import GetDb, RequireAuthenticated, RequireCanReadHousehold, RequireCanWriteHousehold
from app.models import Expense, ExpenseAccount, User
from app.schemas import ExpenseAccountCreate, ExpenseAccountOut, ExpenseAccountUpdate

router = APIRouter(prefix="/expense-accounts", tags=["expense-accounts"])


@router.get("", response_model=list[ExpenseAccountOut])
def ListExpenseAccounts(
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> list[ExpenseAccountOut]:
    RequireCanReadHousehold(user.HouseholdId, user)
    accounts = (
        db.query(ExpenseAccount)
        .filter(ExpenseAccount.HouseholdId == user.HouseholdId)
        .order_by(ExpenseAccount.Name.asc())
        .all()
    )
    return [
        ExpenseAccountOut(
            Id=account.Id,
            HouseholdId=account.HouseholdId,
            OwnerUserId=account.OwnerUserId,
            Name=account.Name,
            Enabled=account.Enabled,
            CreatedAt=account.CreatedAt,
        )
        for account in accounts
    ]


@router.post("", response_model=ExpenseAccountOut, status_code=status.HTTP_201_CREATED)
def CreateExpenseAccount(
    payload: ExpenseAccountCreate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> ExpenseAccountOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    account = ExpenseAccount(
        HouseholdId=user.HouseholdId,
        OwnerUserId=user.Id,
        Name=payload.Name,
        Enabled=payload.Enabled,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return ExpenseAccountOut(
        Id=account.Id,
        HouseholdId=account.HouseholdId,
        OwnerUserId=account.OwnerUserId,
        Name=account.Name,
        Enabled=account.Enabled,
        CreatedAt=account.CreatedAt,
    )


@router.put("/{account_id}", response_model=ExpenseAccountOut)
def UpdateExpenseAccount(
    account_id: int,
    payload: ExpenseAccountUpdate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> ExpenseAccountOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    account = (
        db.query(ExpenseAccount)
        .filter(ExpenseAccount.Id == account_id, ExpenseAccount.HouseholdId == user.HouseholdId)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    old_name = account.Name
    account.Name = payload.Name
    account.Enabled = payload.Enabled
    if old_name != payload.Name:
        db.query(Expense).filter(
            Expense.HouseholdId == user.HouseholdId, Expense.Account == old_name
        ).update({Expense.Account: payload.Name})
    db.add(account)
    db.commit()
    db.refresh(account)
    return ExpenseAccountOut(
        Id=account.Id,
        HouseholdId=account.HouseholdId,
        OwnerUserId=account.OwnerUserId,
        Name=account.Name,
        Enabled=account.Enabled,
        CreatedAt=account.CreatedAt,
    )


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def DeleteExpenseAccount(
    account_id: int,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> None:
    RequireCanWriteHousehold(user.HouseholdId, user)
    account = (
        db.query(ExpenseAccount)
        .filter(ExpenseAccount.Id == account_id, ExpenseAccount.HouseholdId == user.HouseholdId)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    in_use = (
        db.query(Expense)
        .filter(Expense.HouseholdId == user.HouseholdId, Expense.Account == account.Name)
        .first()
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is used by an expense",
        )
    db.delete(account)
    db.commit()
