from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import GetDb, RequireAuthenticated, RequireCanReadHousehold, RequireCanWriteHousehold
from app.models import Scenario, ScenarioAdjustment, User
from app.schemas import ScenarioCreate, ScenarioOut, ScenarioAdjustmentOut

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


def _ToScenarioOut(scenario: Scenario) -> ScenarioOut:
    return ScenarioOut(
        Id=scenario.Id,
        HouseholdId=scenario.HouseholdId,
        CreatedByUserId=scenario.CreatedByUserId,
        Name=scenario.Name,
        ScenarioType=scenario.ScenarioType,
        CreatedAt=scenario.CreatedAt,
        Adjustments=[
            ScenarioAdjustmentOut(
                StreamId=adj.StreamId,
                Amount=adj.Amount,
                Frequency=adj.Frequency,
                Included=adj.Included,
            )
            for adj in scenario.Adjustments
        ],
    )


@router.get("", response_model=list[ScenarioOut])
def ListScenarios(
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> list[ScenarioOut]:
    RequireCanReadHousehold(user.HouseholdId, user)
    scenarios = (
        db.query(Scenario)
        .filter(Scenario.HouseholdId == user.HouseholdId)
        .order_by(Scenario.CreatedAt.desc())
        .all()
    )
    return [_ToScenarioOut(scenario) for scenario in scenarios]


@router.post("", response_model=ScenarioOut, status_code=status.HTTP_201_CREATED)
def CreateScenario(
    payload: ScenarioCreate,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> ScenarioOut:
    RequireCanWriteHousehold(user.HouseholdId, user)
    scenario = Scenario(
        HouseholdId=user.HouseholdId,
        CreatedByUserId=user.Id,
        Name=payload.Name,
        ScenarioType=payload.ScenarioType,
    )
    db.add(scenario)
    db.flush()

    for adjustment in payload.Adjustments:
        db.add(
            ScenarioAdjustment(
                ScenarioId=scenario.Id,
                StreamId=adjustment.StreamId,
                Amount=adjustment.Amount,
                Frequency=adjustment.Frequency,
                Included=adjustment.Included,
            )
        )

    db.commit()
    db.refresh(scenario)
    return _ToScenarioOut(scenario)


@router.get("/{scenario_id}", response_model=ScenarioOut)
def GetScenario(
    scenario_id: int,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> ScenarioOut:
    scenario = (
        db.query(Scenario)
        .filter(Scenario.Id == scenario_id, Scenario.HouseholdId == user.HouseholdId)
        .first()
    )
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    RequireCanReadHousehold(user.HouseholdId, user)
    return _ToScenarioOut(scenario)


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def DeleteScenario(
    scenario_id: int,
    db: Session = Depends(GetDb),
    user: User = Depends(RequireAuthenticated),
) -> None:
    RequireCanWriteHousehold(user.HouseholdId, user)
    scenario = (
        db.query(Scenario)
        .filter(Scenario.Id == scenario_id, Scenario.HouseholdId == user.HouseholdId)
        .first()
    )
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    db.query(ScenarioAdjustment).filter(ScenarioAdjustment.ScenarioId == scenario.Id).delete()
    db.delete(scenario)
    db.commit()
    return None
