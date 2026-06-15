from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, Field


class MenuOptionOut(BaseModel):
    """One choosable menu (Option A, B, …) for a day."""

    letter: str
    name: str | None
    allergens: str | None
    weight: str | None


class MealDayOut(BaseModel):
    date: date_type
    open: bool
    title: str | None = None
    options: list[MenuOptionOut] = []
    # Letter of the currently ordered menu, None when signed off / not ordered.
    ordered_meal: str | None = None
    can_be_changed_until: datetime | None = None


class OrderRequest(BaseModel):
    date: date_type
    # Menu letter ("A", "B", …) to order, or null to sign off the meal.
    choice: str | None = Field(default=None, pattern=r"^[A-H]$")


class OrderResponse(BaseModel):
    date: date_type
    ordered_meal: str | None


class BulkSignupRequest(BaseModel):
    """Auto-register for the preferred menu across the next `days_count` days."""

    days_count: int = Field(ge=1, le=31)
    # Menu letter to order on every open, not-yet-ordered day.
    preferred_choice: str = Field(pattern=r"^[A-H]$")


class BulkSignupResponse(BaseModel):
    updated_days: int
    skipped_days: int
