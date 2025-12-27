"""expenses

Revision ID: 0003_expenses
Revises: 0002_scenarios
Create Date: 2025-12-27
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_expenses"
down_revision = "0002_scenarios"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("Id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("HouseholdId", sa.Integer(), nullable=False),
        sa.Column("OwnerUserId", sa.Integer(), nullable=False),
        sa.Column("Label", sa.String(length=200), nullable=False),
        sa.Column("Amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("Frequency", sa.String(length=50), nullable=False),
        sa.Column("Account", sa.String(length=200), nullable=True),
        sa.Column("Type", sa.String(length=200), nullable=True),
        sa.Column("When", sa.String(length=200), nullable=True),
        sa.Column("Enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("Notes", sa.Text(), nullable=True),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["HouseholdId"], ["households.Id"]),
        sa.ForeignKeyConstraint(["OwnerUserId"], ["users.Id"]),
    )
    op.create_index(op.f("ix_expenses_Id"), "expenses", ["Id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_expenses_Id"), table_name="expenses")
    op.drop_table("expenses")
