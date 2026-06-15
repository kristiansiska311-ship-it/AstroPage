from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class HomeworkDraft(SQLModel, table=True):
    """Cached AI homework draft. One draft per (user, assignment); regenerating
    overwrites it. Drafts are review material only — never submitted to EduPage."""

    __tablename__ = "homework_drafts"
    __table_args__ = (
        UniqueConstraint("user_id", "assignment_id", name="uq_draft_user_assignment"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    # EduPage timeline event id of the homework assignment.
    assignment_id: str = Field(max_length=64, index=True)
    original_text: str = Field(sa_column=Column(Text, nullable=False))
    ai_response: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(
        default_factory=_utcnow, sa_column=Column(DateTime(timezone=True), nullable=False)
    )
