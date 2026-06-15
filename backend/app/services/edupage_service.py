"""Thin async wrapper around the synchronous `edupage-api` library.

Every call into edupage-api uses `requests` under the hood and blocks, so we run
it in a worker thread via `asyncio.to_thread` to avoid stalling the event loop.
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime

import requests
from edupage_api import Edupage
from edupage_api.exceptions import (
    BadCredentialsException,
    CaptchaException,
)

logger = logging.getLogger("app.edupage")


class EduPageAuthError(Exception):
    """Raised when EduPage rejects the login. `reason` is a stable, client-safe code."""

    def __init__(self, reason: str, message: str):
        self.reason = reason
        self.message = message
        super().__init__(message)


class EduPageDataError(Exception):
    """Raised when an authenticated EduPage data fetch fails. `reason` is a stable,
    client-safe code; the raw library error is logged, never surfaced."""

    def __init__(self, reason: str, message: str):
        self.reason = reason
        self.message = message
        super().__init__(message)


def _extract_session_id(edupage: Edupage) -> str:
    """Pull the PHPSESSID cookie out of the authenticated requests session."""
    for cookie in edupage.session.cookies:
        if cookie.name == "PHPSESSID":
            return cookie.value
    raise EduPageAuthError("no_session", "Login succeeded but no session cookie was returned.")


def _login_blocking(username: str, password: str, subdomain: str) -> str:
    edupage = Edupage()
    # Returns a TwoFactorLogin object when 2FA is enabled, else None.
    two_factor = edupage.login(username, password, subdomain)
    if two_factor is not None:
        raise EduPageAuthError(
            "two_factor_required",
            "This account uses two-factor authentication, which isn't supported yet.",
        )
    return _extract_session_id(edupage)


async def login(username: str, password: str, subdomain: str) -> str:
    """Authenticate against `{subdomain}.edupage.org` and return the PHPSESSID.

    The password exists only for the duration of this call and is never returned,
    stored, or logged. Raises EduPageAuthError on any failure.
    """
    try:
        return await asyncio.to_thread(_login_blocking, username, password, subdomain)
    except EduPageAuthError:
        raise  # already a clean, client-safe error (2FA, no session)
    except BadCredentialsException:
        raise EduPageAuthError("bad_credentials", "Invalid username, password, or school domain.")
    except CaptchaException:
        raise EduPageAuthError(
            "captcha", "EduPage requires a captcha. Please log in directly on EduPage and retry."
        )
    except requests.RequestException as exc:
        # DNS failure, timeout, connection refused — usually a wrong/dead subdomain.
        logger.info("edupage unreachable: subdomain=%s err=%s", subdomain, type(exc).__name__)
        raise EduPageAuthError(
            "unreachable",
            "Could not reach EduPage for that school domain. Check the domain and try again.",
        )
    except Exception as exc:
        # edupage-api parses HTML/JSON positionally and raises IndexError/KeyError/etc.
        # when the page isn't the expected login page (e.g. a 404 for a non-existent
        # subdomain). Map all of these to one clean error instead of a 500.
        logger.warning(
            "edupage login parse/unexpected error: subdomain=%s err=%s",
            subdomain,
            type(exc).__name__,
        )
        raise EduPageAuthError(
            "login_failed",
            "Login failed. Double-check your school domain, username, and password.",
        )


def _verify_blocking(session_id: str, subdomain: str, username: str) -> bool:
    try:
        Edupage.from_session_id(session_id, subdomain, username)
        return True
    except BadCredentialsException:
        return False


async def session_is_valid(session_id: str, subdomain: str, username: str) -> bool:
    """Check whether a stored PHPSESSID still authenticates against EduPage."""
    return await asyncio.to_thread(_verify_blocking, session_id, subdomain, username)


# ── Session rehydration ───────────────────────────────────────────────────────


def _rehydrate_blocking(session_id: str, subdomain: str, username: str) -> Edupage:
    return Edupage.from_session_id(session_id, subdomain, username)


async def get_client(session_id: str, subdomain: str, username: str) -> Edupage:
    """Rebuild an authenticated Edupage instance from a stored PHPSESSID.

    Raises EduPageAuthError("session_expired") when EduPage no longer accepts it.
    """
    try:
        return await asyncio.to_thread(_rehydrate_blocking, session_id, subdomain, username)
    except BadCredentialsException:
        raise EduPageAuthError(
            "session_expired", "Your EduPage session has expired. Please log in again."
        )
    except requests.RequestException as exc:
        logger.info(
            "edupage unreachable on rehydrate: subdomain=%s err=%s", subdomain, type(exc).__name__
        )
        raise EduPageDataError("unreachable", "Could not reach EduPage. Please try again.")
    except Exception as exc:
        logger.warning(
            "edupage rehydrate error: subdomain=%s err=%s", subdomain, type(exc).__name__
        )
        raise EduPageAuthError(
            "session_expired", "Your EduPage session is no longer valid. Please log in again."
        )


# ── Data fetchers ─────────────────────────────────────────────────────────────
# Each returns plain dataclasses fully materialised inside the worker thread so
# no lazy edupage-api state is touched from the event loop.


@dataclass
class TimetablePeriod:
    period: int | None
    start: str
    end: str
    subject: str
    classroom: str | None
    teacher: str | None
    is_cancelled: bool
    curriculum: str | None


def _timetable_blocking(edupage: Edupage, day: date) -> list[TimetablePeriod]:
    timetable = edupage.get_my_timetable(day)
    periods: list[TimetablePeriod] = []
    for lesson in timetable.lessons if timetable else []:
        periods.append(
            TimetablePeriod(
                period=lesson.period,
                start=lesson.start_time.strftime("%H:%M"),
                end=lesson.end_time.strftime("%H:%M"),
                subject=lesson.subject.name if lesson.subject else "—",
                classroom=lesson.classrooms[0].name if lesson.classrooms else None,
                teacher=lesson.teachers[0].name if lesson.teachers else None,
                is_cancelled=lesson.is_cancelled,
                curriculum=lesson.curriculum,
            )
        )
    return periods


async def fetch_timetable(edupage: Edupage, day: date) -> list[TimetablePeriod]:
    try:
        return await asyncio.to_thread(_timetable_blocking, edupage, day)
    except Exception as exc:
        logger.warning("timetable fetch failed: err=%s", type(exc).__name__)
        raise EduPageDataError("timetable_failed", "Could not load the timetable from EduPage.")


@dataclass
class HomeworkAssignment:
    id: str
    subject: str | None
    title: str
    description: str
    teacher: str | None
    assigned_at: datetime | None
    due_date: datetime | None
    is_done: bool


def _parse_due_date(data: dict) -> datetime | None:
    raw = data.get("date") or data.get("datetimeto")
    if not raw:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(str(raw), fmt)
        except ValueError:
            continue
    return None


def _homework_blocking(edupage: Edupage) -> list[HomeworkAssignment]:
    from edupage_api.dbi import DbiHelper
    from edupage_api.timeline import EventType

    assignments: list[HomeworkAssignment] = []
    for event in edupage.get_notifications():
        if event.event_type != EventType.HOMEWORK:
            continue
        data = event.additional_data or {}

        subject = None
        subject_id = data.get("predmetid")
        if subject_id:
            try:
                subject = DbiHelper(edupage).fetch_subject_name(int(subject_id))
            except (ValueError, TypeError, KeyError):
                subject = None

        title = data.get("nazov") or (event.text or "").split("\n")[0] or "Homework"
        teacher = (
            event.author if isinstance(event.author, str) else getattr(event.author, "name", None)
        )

        assignments.append(
            HomeworkAssignment(
                id=str(event.event_id),
                subject=subject,
                title=str(title),
                description=event.text or "",
                teacher=teacher,
                assigned_at=event.timestamp,
                due_date=_parse_due_date(data),
                is_done=event.is_done,
            )
        )
    return assignments


async def fetch_homework(edupage: Edupage) -> list[HomeworkAssignment]:
    try:
        return await asyncio.to_thread(_homework_blocking, edupage)
    except Exception as exc:
        logger.warning("homework fetch failed: err=%s", type(exc).__name__)
        raise EduPageDataError("homework_failed", "Could not load homework from EduPage.")


@dataclass
class MealMenu:
    letter: str
    name: str | None
    allergens: str | None
    weight: str | None


@dataclass
class MealDay:
    date: date
    open: bool
    title: str | None
    options: list[MealMenu]
    ordered_meal: str | None
    can_be_changed_until: datetime | None


def _meal_day_blocking(edupage: Edupage, day: date) -> MealDay:
    meals = edupage.get_meals(day)
    lunch = meals.lunch if meals else None
    if lunch is None:
        return MealDay(day, False, None, [], None, None)

    options: list[MealMenu] = []
    for i, menu in enumerate(lunch.menus or []):
        letter = (menu.number or "").strip() or chr(ord("A") + i)
        options.append(MealMenu(letter, menu.name, menu.allergens, menu.weight))

    changed_until = lunch.can_be_changed_until
    if isinstance(changed_until, str):
        try:
            changed_until = datetime.strptime(changed_until, "%Y-%m-%d %H:%M")
        except ValueError:
            changed_until = None

    return MealDay(
        date=day,
        open=True,
        title=lunch.title,
        options=options,
        ordered_meal=lunch.ordered_meal,
        can_be_changed_until=changed_until,
    )


def _meals_blocking(edupage: Edupage, days: list[date]) -> list[MealDay]:
    # One EduPage round trip per day; kept sequential because the underlying
    # requests.Session is not thread-safe.
    result: list[MealDay] = []
    for day in days:
        try:
            result.append(_meal_day_blocking(edupage, day))
        except Exception as exc:
            logger.info("meals fetch failed for %s: err=%s", day, type(exc).__name__)
            result.append(MealDay(day, False, None, [], None, None))
    return result


async def fetch_meals(edupage: Edupage, days: list[date]) -> list[MealDay]:
    try:
        return await asyncio.to_thread(_meals_blocking, edupage, days)
    except Exception as exc:
        logger.warning("meals fetch failed: err=%s", type(exc).__name__)
        raise EduPageDataError("meals_failed", "Could not load canteen menus from EduPage.")


def _order_blocking(edupage: Edupage, day: date, choice: str | None) -> str | None:
    meals = edupage.get_meals(day)
    lunch = meals.lunch if meals else None
    if lunch is None:
        raise EduPageDataError("no_meal", "There is no orderable meal on that day.")
    if choice is None:
        lunch.sign_off(edupage)
        return None
    number = ord(choice) - ord("A") + 1
    if number < 1 or number > max(1, lunch.amount_of_foods):
        raise EduPageDataError("bad_choice", f"Menu option {choice} does not exist on that day.")
    lunch.choose(edupage, number)
    return lunch.ordered_meal


async def order_meal(edupage: Edupage, day: date, choice: str | None) -> str | None:
    """Order menu `choice` ("A", "B", …) for `day`, or sign off when None.

    Returns the resulting ordered meal letter (None after sign-off).
    """
    try:
        return await asyncio.to_thread(_order_blocking, edupage, day, choice)
    except EduPageDataError:
        raise
    except Exception as exc:
        logger.warning("meal order failed: day=%s err=%s", day, type(exc).__name__)
        raise EduPageDataError(
            "order_failed", "EduPage rejected the meal change. It may be past the deadline."
        )
