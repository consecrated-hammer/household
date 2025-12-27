"""expense details and meta

Revision ID: 0004_expense_details
Revises: 0003_expenses
Create Date: 2025-12-27
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_expense_details"
down_revision = "0003_expenses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("NextDueDate", sa.Date(), nullable=True))
    op.add_column("expenses", sa.Column("Cadence", sa.String(length=50), nullable=True))
    op.add_column("expenses", sa.Column("Interval", sa.Integer(), nullable=True))
    op.add_column("expenses", sa.Column("Month", sa.Integer(), nullable=True))
    op.add_column("expenses", sa.Column("DayOfMonth", sa.Integer(), nullable=True))

    op.create_table(
        "expense_accounts",
        sa.Column("Id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("HouseholdId", sa.Integer(), nullable=False),
        sa.Column("OwnerUserId", sa.Integer(), nullable=False),
        sa.Column("Name", sa.String(length=200), nullable=False),
        sa.Column("Enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["HouseholdId"], ["households.Id"]),
        sa.ForeignKeyConstraint(["OwnerUserId"], ["users.Id"]),
    )
    op.create_index(op.f("ix_expense_accounts_Id"), "expense_accounts", ["Id"], unique=False)

    op.create_table(
        "expense_types",
        sa.Column("Id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("HouseholdId", sa.Integer(), nullable=False),
        sa.Column("OwnerUserId", sa.Integer(), nullable=False),
        sa.Column("Name", sa.String(length=200), nullable=False),
        sa.Column("Enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["HouseholdId"], ["households.Id"]),
        sa.ForeignKeyConstraint(["OwnerUserId"], ["users.Id"]),
    )
    op.create_index(op.f("ix_expense_types_Id"), "expense_types", ["Id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_expense_types_Id"), table_name="expense_types")
    op.drop_table("expense_types")
    op.drop_index(op.f("ix_expense_accounts_Id"), table_name="expense_accounts")
    op.drop_table("expense_accounts")

    op.drop_column("expenses", "DayOfMonth")
    op.drop_column("expenses", "Month")
    op.drop_column("expenses", "Interval")
    op.drop_column("expenses", "Cadence")
    op.drop_column("expenses", "NextDueDate")
