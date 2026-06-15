"""Aggregates EduPage data into the home-dashboard summary."""

from datetime import date, datetime, timedelta

from edupage_api import Edupage

from app.schemas.dashboard import DashboardSummary, PeriodOut
from app.services import edupage_service


async def build_summary(edupage: Edupage, day: date | None = None) -> DashboardSummary:
    day = day or date.today()
    periods = await edupage_service.fetch_timetable(edupage, day)
    assignments = await edupage_service.fetch_homework(edupage)

    now = datetime.now()
    soon = now + timedelta(hours=24)
    pending = [a for a in assignments if not a.is_done]
    due_soon = [a for a in pending if a.due_date is not None and now <= a.due_date <= soon]

    return DashboardSummary(
        date=day,
        pending_homework=len(pending),
        due_within_24h=len(due_soon),
        lessons_total=len(periods),
        lessons_cancelled=sum(1 for p in periods if p.is_cancelled),
        schedule=[
            PeriodOut(
                period=p.period,
                start=p.start,
                end=p.end,
                subject=p.subject,
                classroom=p.classroom,
                teacher=p.teacher,
                is_cancelled=p.is_cancelled,
                curriculum=p.curriculum,
            )
            for p in periods
        ],
    )
