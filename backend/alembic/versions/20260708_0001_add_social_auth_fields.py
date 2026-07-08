"""add social auth fields

Revision ID: 20260708_0001
Revises:
Create Date: 2026-07-08 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260708_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("linkedin_id", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(length=32), server_default="email", nullable=False),
    )
    op.add_column("users", sa.Column("profile_picture", sa.String(length=1000), nullable=True))
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("users", sa.Column("oauth_profile", sa.JSON(), nullable=True))
    op.create_index(op.f("ix_users_google_id"), "users", ["google_id"], unique=True)
    op.create_index(op.f("ix_users_linkedin_id"), "users", ["linkedin_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_linkedin_id"), table_name="users")
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "oauth_profile")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "profile_picture")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "linkedin_id")
    op.drop_column("users", "google_id")
