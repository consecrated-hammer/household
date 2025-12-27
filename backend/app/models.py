from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Household(Base):
    __tablename__ = "households"

    Id = Column(Integer, primary_key=True, index=True)
    Name = Column(String(200), nullable=False)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    Users = relationship("User", back_populates="Household")


class User(Base):
    __tablename__ = "users"

    Id = Column(Integer, primary_key=True, index=True)
    Email = Column(String(255), unique=True, index=True, nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    Role = Column(
        Enum("Admin", "Editor", "User", "ReadOnly", name="user_role"),
        nullable=False,
        default="User",
    )
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    Household = relationship("Household", back_populates="Users")
    RefreshTokens = relationship("RefreshToken", back_populates="User")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    Id = Column(Integer, primary_key=True, index=True)
    UserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    TokenHash = Column(String(255), nullable=False)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    ExpiresAt = Column(DateTime(timezone=True), nullable=False)
    RevokedAt = Column(DateTime(timezone=True))

    User = relationship("User", back_populates="RefreshTokens")


class IncomeStream(Base):
    __tablename__ = "income_streams"

    Id = Column(Integer, primary_key=True, index=True)
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    OwnerUserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    Label = Column(String(200), nullable=False)
    NetAmount = Column(Numeric(12, 2), nullable=False)
    GrossAmount = Column(Numeric(12, 2), nullable=False)
    FirstPayDate = Column(Date, nullable=False)
    Frequency = Column(String(50), nullable=False)
    EndDate = Column(Date)
    Notes = Column(Text)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class Scenario(Base):
    __tablename__ = "scenarios"

    Id = Column(Integer, primary_key=True, index=True)
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    CreatedByUserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    Name = Column(String(200), nullable=False)
    ScenarioType = Column(String(20), nullable=False)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    Adjustments = relationship("ScenarioAdjustment", back_populates="Scenario")


class ScenarioAdjustment(Base):
    __tablename__ = "scenario_adjustments"

    Id = Column(Integer, primary_key=True, index=True)
    ScenarioId = Column(Integer, ForeignKey("scenarios.Id"), nullable=False)
    StreamId = Column(Integer, ForeignKey("income_streams.Id"), nullable=False)
    Amount = Column(Numeric(12, 2), nullable=False)
    Frequency = Column(String(50), nullable=False)
    Included = Column(Boolean, nullable=False, default=True)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    Scenario = relationship("Scenario", back_populates="Adjustments")


class Expense(Base):
    __tablename__ = "expenses"

    Id = Column(Integer, primary_key=True, index=True)
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    OwnerUserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    Label = Column(String(200), nullable=False)
    Amount = Column(Numeric(12, 2), nullable=False)
    Frequency = Column(String(50), nullable=False)
    Account = Column(String(200))
    Type = Column(String(200))
    NextDueDate = Column(Date)
    Cadence = Column(String(50))
    Interval = Column(Integer)
    Month = Column(Integer)
    DayOfMonth = Column(Integer)
    Enabled = Column(Boolean, nullable=False, default=True)
    Notes = Column(Text)
    DisplayOrder = Column(Integer, nullable=False, default=0, index=True)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ExpenseAccount(Base):
    __tablename__ = "expense_accounts"

    Id = Column(Integer, primary_key=True, index=True)
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    OwnerUserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    Name = Column(String(200), nullable=False)
    Enabled = Column(Boolean, nullable=False, default=True)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ExpenseType(Base):
    __tablename__ = "expense_types"

    Id = Column(Integer, primary_key=True, index=True)
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    OwnerUserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    Name = Column(String(200), nullable=False)
    Enabled = Column(Boolean, nullable=False, default=True)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class TablePreference(Base):
    __tablename__ = "table_preferences"

    Id = Column(Integer, primary_key=True, index=True)
    HouseholdId = Column(Integer, ForeignKey("households.Id"), nullable=False)
    UserId = Column(Integer, ForeignKey("users.Id"), nullable=False)
    TableKey = Column(String(200), nullable=False)
    State = Column(JSON, nullable=False)
    CreatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    UpdatedAt = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
