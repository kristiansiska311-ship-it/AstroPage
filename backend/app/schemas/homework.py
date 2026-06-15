from datetime import datetime

from pydantic import BaseModel, Field


class HomeworkItem(BaseModel):
    """One assignment from the EduPage timeline."""

    id: str
    subject: str | None
    title: str
    description: str
    teacher: str | None
    assigned_at: datetime | None
    due_date: datetime | None
    is_done: bool


class GenerateAiRequest(BaseModel):
    assignment_id: str = Field(..., min_length=1, max_length=64)
    # Regenerate even when a cached draft exists.
    force: bool = False


class DraftResponse(BaseModel):
    """The AI output is always a draft — the frontend renders it editable and
    nothing is ever submitted to EduPage."""

    assignment_id: str
    draft: str
    cached: bool
    created_at: datetime
