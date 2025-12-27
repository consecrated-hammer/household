from fastapi import APIRouter, Depends

from app.deps import RequireAuthenticated
from app.schemas import TaxCalculatorRequest, TaxCalculatorResponse, TaxYearOut
from app.services.tax_calculator import EstimateTax
from app.services.tax_data import ListTaxYears

router = APIRouter(prefix="/tax-calculator", tags=["tax-calculator"])


@router.get("/years", response_model=list[TaxYearOut])
def GetTaxYears(_: None = Depends(RequireAuthenticated)) -> list[TaxYearOut]:
    return [
        TaxYearOut(
            Label=tax_year.Label,
            StartDate=tax_year.StartDate,
            EndDate=tax_year.EndDate,
            IsEstimated=tax_year.IsEstimated,
        )
        for tax_year in ListTaxYears()
    ]


@router.post("/estimate", response_model=TaxCalculatorResponse)
def CalculateTax(
    payload: TaxCalculatorRequest,
    _: None = Depends(RequireAuthenticated),
) -> TaxCalculatorResponse:
    return EstimateTax(payload)
