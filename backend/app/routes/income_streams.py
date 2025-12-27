from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import GetDb, RequireAuthenticated, RequireCanReadHousehold, RequireCanWriteHousehold
from app.core.config import settings
from app.models import IncomeStream, User
from app.schemas import IncomeStreamCreate, IncomeStreamOut, IncomeStreamUpdate
from app.services.schedules import FinancialYearRange, LastNextOccurrence, AnnualizedBreakdown
from datetime import date

router = APIRouter(prefix="/income-streams", tags=["income-streams"])


def _BuildIncomeStreamOut(stream: IncomeStream) -> IncomeStreamOut:
    today = date.today()
    fy_start, fy_end = FinancialYearRange(
        today, settings.FinancialYearStartMonth, settings.FinancialYearStartDay
    )
    last_pay, next_pay = LastNextOccurrence(
        stream.FirstPayDate,
        stream.Frequency,
        today,
        stream.EndDate,
    )
    net_breakdown = AnnualizedBreakdown(stream.NetAmount, stream.Frequency, fy_start, fy_end)
    gross_breakdown = AnnualizedBreakdown(stream.GrossAmount, stream.Frequency, fy_start, fy_end)
    return IncomeStreamOut(
        Id=stream.Id,
        HouseholdId=stream.HouseholdId,
        OwnerUserId=stream.OwnerUserId,
        Label=stream.Label,
        NetAmount=stream.NetAmount,
        GrossAmount=stream.GrossAmount,
        FirstPayDate=stream.FirstPayDate,
        Frequency=stream.Frequency,
        EndDate=stream.EndDate,
        Notes=stream.Notes,
        CreatedAt=stream.CreatedAt,
        LastPayDate=last_pay,
        NextPayDate=next_pay,
        NetPerDay=net_breakdown["PerDay"],
        NetPerWeek=net_breakdown["PerWeek"],
        NetPerFortnight=net_breakdown["PerFortnight"],
        NetPerMonth=net_breakdown["PerMonth"],
        NetPerYear=net_breakdown["PerYear"],
        GrossPerDay=gross_breakdown["PerDay"],
        GrossPerWeek=gross_breakdown["PerWeek"],
        GrossPerFortnight=gross_breakdown["PerFortnight"],
        GrossPerMonth=gross_breakdown["PerMonth"],
        GrossPerYear=gross_breakdown["PerYear"],
    )


@router.get("", response_model=list[IncomeStreamOut])
def ListIncomeStreams(
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> list[IncomeStreamOut]:
    RequireCanReadHousehold(user.HouseholdId, user)
    streams = (
        db.query(IncomeStream)
        .filter(IncomeStream.HouseholdId == user.HouseholdId)
        .order_by(IncomeStream.CreatedAt.desc())
        .all()
    )
    return [_BuildIncomeStreamOut(stream) for stream in streams]


@router.post("", response_model=IncomeStreamOut, status_code=status.HTTP_201_CREATED)
def CreateIncomeStream(
    payload: IncomeStreamCreate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> IncomeStreamOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    stream = IncomeStream(
        HouseholdId=user.HouseholdId,
        OwnerUserId=user.Id,
        Label=payload.Label,
        NetAmount=payload.NetAmount,
        GrossAmount=payload.GrossAmount,
        FirstPayDate=payload.FirstPayDate,
        Frequency=payload.Frequency,
        EndDate=payload.EndDate,
        Notes=payload.Notes,
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return _BuildIncomeStreamOut(stream)


@router.put("/{stream_id}", response_model=IncomeStreamOut)
def UpdateIncomeStream(
    stream_id: int,
    payload: IncomeStreamUpdate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> IncomeStreamOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    stream = (
        db.query(IncomeStream)
        .filter(IncomeStream.Id == stream_id, IncomeStream.HouseholdId == user.HouseholdId)
        .first()
    )
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income stream not found")

    stream.Label = payload.Label
    stream.NetAmount = payload.NetAmount
    stream.GrossAmount = payload.GrossAmount
    stream.FirstPayDate = payload.FirstPayDate
    stream.Frequency = payload.Frequency
    stream.EndDate = payload.EndDate
    stream.Notes = payload.Notes
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return _BuildIncomeStreamOut(stream)
