"""scenarios

Revision ID: 0002_scenarios
Revises: 0001_initial
Create Date: 2025-01-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_scenarios"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scenarios",
        sa.Column("Id", sa.Integer(), primary_key=True),
        sa.Column("HouseholdId", sa.Integer(), nullable=False),
        sa.Column("CreatedByUserId", sa.Integer(), nullable=False),
        sa.Column("Name", sa.String(length=200), nullable=False),
        sa.Column("ScenarioType", sa.String(length=20), nullable=False),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["HouseholdId"], ["households.Id"]),
        sa.ForeignKeyConstraint(["CreatedByUserId"], ["users.Id"]),
    )

    op.create_table(
        "scenario_adjustments",
        sa.Column("Id", sa.Integer(), primary_key=True),
        sa.Column("ScenarioId", sa.Integer(), nullable=False),
        sa.Column("StreamId", sa.Integer(), nullable=False),
        sa.Column("Amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("Frequency", sa.String(length=50), nullable=False),
        sa.Column("Included", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ScenarioId"], ["scenarios.Id"]),
        sa.ForeignKeyConstraint(["StreamId"], ["income_streams.Id"]),
    )


def downgrade() -> None:
    op.drop_table("scenario_adjustments")
    op.drop_table("scenarios")
