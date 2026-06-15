from datetime import date

from pydantic import BaseModel


class PeriodOut(BaseModel):
    """One timetable period for the dashboard timeline."""

    period: int | None
    start: str  # "08:00"
    end: str  # "08:45"
    subject: str
    classroom: str | None
    teacher: str | None
    is_cancelled: bool
    curriculum: str | None


class DashboardSummary(BaseModel):
    date: date
    pending_homework: int
    due_within_24h: int
    lessons_total: int
    lessons_cancelled: int
    schedule: list[PeriodOut]
