"""Canteen menus and meal ordering."""

from datetime import date, timedelta

from edupage_api import Edupage

from app.schemas.canteen import MealDayOut, MenuOptionOut
from app.services import edupage_service
from app.services.edupage_service import EduPageDataError

MAX_WEEKS = 4


def upcoming_weekdays(start: date, weeks: int) -> list[date]:
    """Mon–Fri dates from the Monday of `start`'s week, for `weeks` weeks."""
    monday = start - timedelta(days=start.weekday())
    return [monday + timedelta(weeks=w, days=d) for w in range(weeks) for d in range(5)]


async def list_meals(edupage: Edupage, weeks: int) -> list[MealDayOut]:
    days = upcoming_weekdays(date.today(), min(max(weeks, 1), MAX_WEEKS))
    meal_days = await edupage_service.fetch_meals(edupage, days)
    return [
        MealDayOut(
            date=m.date,
            open=m.open,
            title=m.title,
            options=[
                MenuOptionOut(letter=o.letter, name=o.name, allergens=o.allergens, weight=o.weight)
                for o in m.options
            ],
            ordered_meal=m.ordered_meal,
            can_be_changed_until=m.can_be_changed_until,
        )
        for m in meal_days
    ]


async def order(edupage: Edupage, day: date, choice: str | None) -> str | None:
    return await edupage_service.order_meal(edupage, day, choice)


async def bulk_signup(edupage: Edupage, days_count: int, preferred_choice: str) -> tuple[int, int]:
    """Order `preferred_choice` on every open day in the next `days_count` days.

    Starts from tomorrow. A day is skipped (not an error) when the kitchen is
    closed, the student is already signed up, the preferred menu isn't offered,
    or EduPage rejects the change (e.g. past the cut-off). Returns
    ``(updated_days, skipped_days)``.

    Each EduPage round trip is sequential by design: the underlying
    ``requests.Session`` is not thread-safe, so concurrent orders would race.
    """
    start = date.today() + timedelta(days=1)
    days = [start + timedelta(days=i) for i in range(days_count)]
    meal_days = await edupage_service.fetch_meals(edupage, days)

    updated = 0
    skipped = 0
    for meal_day in meal_days:
        already_ordered = meal_day.ordered_meal is not None
        offers_choice = any(o.letter == preferred_choice for o in meal_day.options)
        if not meal_day.open or already_ordered or not offers_choice:
            skipped += 1
            continue
        try:
            await edupage_service.order_meal(edupage, meal_day.date, preferred_choice)
            updated += 1
        except EduPageDataError:
            # Cut-off passed or EduPage refused this day — keep going.
            skipped += 1
    return updated, skipped
