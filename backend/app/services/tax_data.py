from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True)
class TaxBracket:
    Threshold: Decimal
    Rate: Decimal
    BaseTax: Decimal


@dataclass(frozen=True)
class TaxYear:
    Label: str
    StartDate: date
    EndDate: date
    Brackets: tuple[TaxBracket, ...]
    MedicareLevyRate: Decimal
    MlsRate: Decimal
    IsEstimated: bool = False


TAX_YEARS: tuple[TaxYear, ...] = (
    TaxYear(
        Label="2023-24",
        StartDate=date(2023, 7, 1),
        EndDate=date(2024, 6, 30),
        Brackets=(
            TaxBracket(Threshold=Decimal("0"), Rate=Decimal("0.0"), BaseTax=Decimal("0")),
            TaxBracket(Threshold=Decimal("18200"), Rate=Decimal("0.19"), BaseTax=Decimal("0")),
            TaxBracket(Threshold=Decimal("45000"), Rate=Decimal("0.325"), BaseTax=Decimal("5092")),
            TaxBracket(Threshold=Decimal("120000"), Rate=Decimal("0.37"), BaseTax=Decimal("29467")),
            TaxBracket(Threshold=Decimal("180000"), Rate=Decimal("0.45"), BaseTax=Decimal("51667")),
        ),
        MedicareLevyRate=Decimal("0.02"),
        MlsRate=Decimal("0.01"),
    ),
    TaxYear(
        Label="2024-25",
        StartDate=date(2024, 7, 1),
        EndDate=date(2025, 6, 30),
        Brackets=(
            TaxBracket(Threshold=Decimal("0"), Rate=Decimal("0.0"), BaseTax=Decimal("0")),
            TaxBracket(Threshold=Decimal("18200"), Rate=Decimal("0.16"), BaseTax=Decimal("0")),
            TaxBracket(Threshold=Decimal("45000"), Rate=Decimal("0.30"), BaseTax=Decimal("4288")),
            TaxBracket(Threshold=Decimal("135000"), Rate=Decimal("0.37"), BaseTax=Decimal("31288")),
            TaxBracket(Threshold=Decimal("190000"), Rate=Decimal("0.45"), BaseTax=Decimal("51638")),
        ),
        MedicareLevyRate=Decimal("0.02"),
        MlsRate=Decimal("0.01"),
    ),
    TaxYear(
        Label="2025-26",
        StartDate=date(2025, 7, 1),
        EndDate=date(2026, 6, 30),
        Brackets=(
            TaxBracket(Threshold=Decimal("0"), Rate=Decimal("0.0"), BaseTax=Decimal("0")),
            TaxBracket(Threshold=Decimal("18200"), Rate=Decimal("0.16"), BaseTax=Decimal("0")),
            TaxBracket(Threshold=Decimal("45000"), Rate=Decimal("0.30"), BaseTax=Decimal("4288")),
            TaxBracket(Threshold=Decimal("135000"), Rate=Decimal("0.37"), BaseTax=Decimal("31288")),
            TaxBracket(Threshold=Decimal("190000"), Rate=Decimal("0.45"), BaseTax=Decimal("51638")),
        ),
        MedicareLevyRate=Decimal("0.02"),
        MlsRate=Decimal("0.01"),
        IsEstimated=True,
    ),
)


def ListTaxYears() -> list[TaxYear]:
    return list(TAX_YEARS)


def GetTaxYearByLabel(label: str | None) -> TaxYear:
    if label:
        for tax_year in TAX_YEARS:
            if tax_year.Label == label:
                return tax_year
    today = date.today()
    for tax_year in TAX_YEARS:
        if tax_year.StartDate <= today <= tax_year.EndDate:
            return tax_year
    return max(TAX_YEARS, key=lambda item: item.StartDate)
