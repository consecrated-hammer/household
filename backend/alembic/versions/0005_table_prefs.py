"""table prefs and expense order

Revision ID: 0005_table_prefs
Revises: 0004_expense_details
Create Date: 2025-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_table_prefs"
down_revision = "0004_expense_details"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    dialect = bind.dialect.name

    columns = [col["name"] for col in inspector.get_columns("expenses")]
    if "DisplayOrder" not in columns:
        op.add_column(
            "expenses",
            sa.Column("DisplayOrder", sa.Integer(), nullable=False, server_default="0"),
        )
        op.execute("UPDATE expenses SET \"DisplayOrder\" = \"Id\"")
        if dialect != "sqlite":
            op.alter_column("expenses", "DisplayOrder", server_default=None)

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("expenses")}
    display_index = op.f("ix_expenses_DisplayOrder")
    if display_index not in existing_indexes:
        op.create_index(display_index, "expenses", ["DisplayOrder"], unique=False)

    tables = set(inspector.get_table_names())
    if "table_preferences" not in tables:
        op.create_table(
            "table_preferences",
            sa.Column("Id", sa.Integer(), primary_key=True),
            sa.Column("HouseholdId", sa.Integer(), sa.ForeignKey("households.Id"), nullable=False),
            sa.Column("UserId", sa.Integer(), sa.ForeignKey("users.Id"), nullable=False),
            sa.Column("TableKey", sa.String(length=200), nullable=False),
            sa.Column("State", sa.JSON(), nullable=False),
            sa.Column("CreatedAt", sa.DateTime(timezone=True), nullable=False),
            sa.Column("UpdatedAt", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index(
            "ix_table_preferences_TableKey", "table_preferences", ["TableKey"], unique=False
        )
        if dialect == "sqlite":
            op.create_index(
                "uq_table_preferences_user_table",
                "table_preferences",
                ["UserId", "TableKey"],
                unique=True,
            )
        else:
            op.create_unique_constraint(
                "uq_table_preferences_user_table",
                "table_preferences",
                ["UserId", "TableKey"],
            )


def downgrade() -> None:
    op.drop_constraint("uq_table_preferences_user_table", "table_preferences", type_="unique")
    op.drop_index("ix_table_preferences_TableKey", table_name="table_preferences")
    op.drop_table("table_preferences")

    op.drop_index(op.f("ix_expenses_DisplayOrder"), table_name="expenses")
    op.drop_column("expenses", "DisplayOrder")
