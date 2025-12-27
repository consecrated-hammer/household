from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class TokenPair(BaseModel):
    AccessToken: str
    RefreshToken: str
    TokenType: str = "bearer"


class UserRegister(BaseModel):
    Email: EmailStr
    Password: str = Field(min_length=8)
    HouseholdName: str = Field(min_length=2, max_length=200)


class UserLogin(BaseModel):
    Email: EmailStr
    Password: str


class RefreshRequest(BaseModel):
    RefreshToken: str


class UserOut(BaseModel):
    Id: int
    Email: EmailStr
    Role: str
    HouseholdId: int


class IncomeStreamCreate(BaseModel):
    Label: str = Field(min_length=1, max_length=200)
    NetAmount: Decimal
    GrossAmount: Decimal
    FirstPayDate: date
    Frequency: str
    EndDate: Optional[date] = None
    Notes: Optional[str] = None


class IncomeStreamUpdate(BaseModel):
    Label: str = Field(min_length=1, max_length=200)
    NetAmount: Decimal
    GrossAmount: Decimal
    FirstPayDate: date
    Frequency: str
    EndDate: Optional[date] = None
    Notes: Optional[str] = None


class IncomeStreamOut(BaseModel):
    Id: int
    HouseholdId: int
    OwnerUserId: int
    Label: str
    NetAmount: Decimal
    GrossAmount: Decimal
    FirstPayDate: date
    Frequency: str
    EndDate: Optional[date] = None
    Notes: Optional[str] = None
    CreatedAt: datetime
    LastPayDate: Optional[date] = None
    NextPayDate: Optional[date] = None
    NetPerDay: Decimal
    NetPerWeek: Decimal
    NetPerFortnight: Decimal
    NetPerMonth: Decimal
    NetPerYear: Decimal
    GrossPerDay: Decimal
    GrossPerWeek: Decimal
    GrossPerFortnight: Decimal
    GrossPerMonth: Decimal
    GrossPerYear: Decimal

    class Config:
        from_attributes = True


class ScenarioAdjustmentIn(BaseModel):
    StreamId: int
    Amount: Decimal
    Frequency: str
    Included: bool


class ScenarioCreate(BaseModel):
    Name: str = Field(min_length=1, max_length=200)
    ScenarioType: str = Field(min_length=3, max_length=20)
    Adjustments: list[ScenarioAdjustmentIn]


class ScenarioAdjustmentOut(BaseModel):
    StreamId: int
    Amount: Decimal
    Frequency: str
    Included: bool


class ScenarioOut(BaseModel):
    Id: int
    HouseholdId: int
    CreatedByUserId: int
    Name: str
    ScenarioType: str
    CreatedAt: datetime
    Adjustments: list[ScenarioAdjustmentOut]

    class Config:
        from_attributes = True


class TaxYearOut(BaseModel):
    Label: str
    StartDate: date
    EndDate: date
    IsEstimated: bool


class TaxCalculatorRequest(BaseModel):
    SalaryAmount: Decimal
    SalaryFrequency: str
    IncludesSuper: bool
    SuperRate: Decimal = Decimal("0")
    PrivateHealth: bool = False
    NovatedLeaseAmount: Decimal = Decimal("0")
    NovatedLeaseFrequency: str = "Yearly"
    HoursPerWeek: Decimal | None = None
    DaysPerWeek: Decimal | None = None
    TaxYear: str | None = None


class TaxPeriodAmounts(BaseModel):
    Weekly: Decimal
    Fortnightly: Decimal
    Monthly: Decimal
    Yearly: Decimal


class TaxCalculatorResponse(BaseModel):
    TaxYear: str
    IsEstimated: bool
    SalaryAnnual: Decimal
    GrossAnnual: Decimal
    TaxableAnnual: Decimal
    SuperAnnual: Decimal
    NovatedLeaseAnnual: Decimal
    IncomeTaxAnnual: Decimal
    MedicareAnnual: Decimal
    MlsAnnual: Decimal
    NetAnnual: Decimal
    Gross: TaxPeriodAmounts
    Net: TaxPeriodAmounts
    IncomeTax: TaxPeriodAmounts
    Medicare: TaxPeriodAmounts
    Mls: TaxPeriodAmounts
    Super: TaxPeriodAmounts
