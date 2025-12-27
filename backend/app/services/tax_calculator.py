from decimal import Decimal, ROUND_HALF_UP

from app.schemas import TaxCalculatorRequest, TaxCalculatorResponse, TaxPeriodAmounts
from app.services.tax_data import GetTaxYearByLabel, TaxBracket, TaxYear


def _NormalizeFrequency(value: str) -> str:
    return (value or "").strip().lower()


def _QuantizeMoney(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _AnnualizeAmount(
    amount: Decimal,
    frequency: str,
    hours_per_week: Decimal,
    days_per_week: Decimal,
) -> Decimal:
    freq = _NormalizeFrequency(frequency)
    if freq == "hourly":
        return amount * hours_per_week * Decimal("52")
    if freq == "daily":
        return amount * days_per_week * Decimal("52")
    if freq == "weekly":
        return amount * Decimal("52")
    if freq == "fortnightly":
        return amount * Decimal("26")
    if freq == "monthly":
        return amount * Decimal("12")
    if freq == "quarterly":
        return amount * Decimal("4")
    return amount


def _PeriodAmounts(annual_amount: Decimal) -> TaxPeriodAmounts:
    return TaxPeriodAmounts(
        Weekly=_QuantizeMoney(annual_amount / Decimal("52")),
        Fortnightly=_QuantizeMoney(annual_amount / Decimal("26")),
        Monthly=_QuantizeMoney(annual_amount / Decimal("12")),
        Yearly=_QuantizeMoney(annual_amount),
    )


def _CalculateIncomeTax(annual_taxable: Decimal, tax_year: TaxYear) -> Decimal:
    taxable = max(annual_taxable, Decimal("0"))
    for bracket in reversed(tax_year.Brackets):
        if taxable > bracket.Threshold:
            return bracket.BaseTax + (taxable - bracket.Threshold) * bracket.Rate
    return Decimal("0")


def EstimateTax(payload: TaxCalculatorRequest) -> TaxCalculatorResponse:
    tax_year = GetTaxYearByLabel(payload.TaxYear)
    hours_per_week = payload.HoursPerWeek or Decimal("38")
    days_per_week = payload.DaysPerWeek or Decimal("5")

    salary_annual = _AnnualizeAmount(
        payload.SalaryAmount,
        payload.SalaryFrequency,
        hours_per_week,
        days_per_week,
    )
    novated_annual = _AnnualizeAmount(
        payload.NovatedLeaseAmount or Decimal("0"),
        payload.NovatedLeaseFrequency or "Yearly",
        hours_per_week,
        days_per_week,
    )
    super_rate = (payload.SuperRate or Decimal("0")) / Decimal("100")
    includes_super = payload.IncludesSuper

    if includes_super and super_rate > 0:
        taxable_base = salary_annual / (Decimal("1") + super_rate)
        super_annual = salary_annual - taxable_base
    else:
        taxable_base = salary_annual
        super_annual = taxable_base * super_rate

    taxable_income = max(taxable_base - novated_annual, Decimal("0"))
    income_tax = _CalculateIncomeTax(taxable_income, tax_year)
    medicare = taxable_income * tax_year.MedicareLevyRate
    mls = Decimal("0") if payload.PrivateHealth else taxable_income * tax_year.MlsRate
    net_annual = taxable_base - novated_annual - income_tax - medicare - mls

    return TaxCalculatorResponse(
        TaxYear=tax_year.Label,
        IsEstimated=tax_year.IsEstimated,
        SalaryAnnual=_QuantizeMoney(salary_annual),
        GrossAnnual=_QuantizeMoney(taxable_base),
        TaxableAnnual=_QuantizeMoney(taxable_income),
        SuperAnnual=_QuantizeMoney(super_annual),
        NovatedLeaseAnnual=_QuantizeMoney(novated_annual),
        IncomeTaxAnnual=_QuantizeMoney(income_tax),
        MedicareAnnual=_QuantizeMoney(medicare),
        MlsAnnual=_QuantizeMoney(mls),
        NetAnnual=_QuantizeMoney(net_annual),
        Gross=_PeriodAmounts(taxable_base),
        Net=_PeriodAmounts(net_annual),
        IncomeTax=_PeriodAmounts(income_tax),
        Medicare=_PeriodAmounts(medicare),
        Mls=_PeriodAmounts(mls),
        Super=_PeriodAmounts(super_annual),
    )
