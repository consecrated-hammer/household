"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2024-01-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "households",
        sa.Column("Id", sa.Integer(), primary_key=True),
        sa.Column("Name", sa.String(length=200), nullable=False),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("Id", sa.Integer(), primary_key=True),
        sa.Column("Email", sa.String(length=255), nullable=False),
        sa.Column("PasswordHash", sa.String(length=255), nullable=False),
        sa.Column("Role", sa.Enum("Admin", "Editor", "User", "ReadOnly", name="user_role"), nullable=False),
        sa.Column("HouseholdId", sa.Integer(), nullable=False),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["HouseholdId"], ["households.Id"]),
    )
    op.create_index("ix_users_email", "users", ["Email"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("Id", sa.Integer(), primary_key=True),
        sa.Column("UserId", sa.Integer(), nullable=False),
        sa.Column("TokenHash", sa.String(length=255), nullable=False),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ExpiresAt", sa.DateTime(timezone=True), nullable=False),
        sa.Column("RevokedAt", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["UserId"], ["users.Id"]),
    )

    op.create_table(
        "income_streams",
        sa.Column("Id", sa.Integer(), primary_key=True),
        sa.Column("HouseholdId", sa.Integer(), nullable=False),
        sa.Column("OwnerUserId", sa.Integer(), nullable=False),
        sa.Column("Label", sa.String(length=200), nullable=False),
        sa.Column("NetAmount", sa.Numeric(12, 2), nullable=False),
        sa.Column("GrossAmount", sa.Numeric(12, 2), nullable=False),
        sa.Column("FirstPayDate", sa.Date(), nullable=False),
        sa.Column("Frequency", sa.String(length=50), nullable=False),
        sa.Column("EndDate", sa.Date(), nullable=True),
        sa.Column("Notes", sa.Text(), nullable=True),
        sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["HouseholdId"], ["households.Id"]),
        sa.ForeignKeyConstraint(["OwnerUserId"], ["users.Id"]),
    )


def downgrade() -> None:
    op.drop_table("income_streams")
    op.drop_table("refresh_tokens")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("households")
    op.execute("DROP TYPE IF EXISTS user_role")
