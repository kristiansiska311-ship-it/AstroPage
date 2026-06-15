"""Shared FastAPI dependencies: HMAC verification and the EduPage session worker.

`get_auth_context` resolves the JWT cookie into the user + decrypted EduPage
session id; `get_edupage_client` builds on it to hand endpoints a ready-to-use,
authenticated Edupage instance.
"""

import logging
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from edupage_api import Edupage
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token, verify_signature
from app.db.session import get_session
from app.models.user import User
from app.services import auth_service, edupage_service
from app.services.edupage_service import EduPageAuthError, EduPageDataError

logger = logging.getLogger("app.deps")

# Name of the HttpOnly cookie carrying the session JWT.
SESSION_COOKIE_NAME = "astropage_session"


async def verify_hmac_signature(
    x_signature: Annotated[str | None, Header()] = None,
    x_payload: Annotated[str | None, Header()] = None,
) -> None:
    """Optional dependency: verify HMAC signature on signed endpoints."""
    if x_signature is None or x_payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing signature headers"
        )
    if not verify_signature(x_payload, x_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")


@dataclass
class AuthContext:
    """Authenticated request context. `edupage_session_id` is the decrypted
    PHPSESSID — keep it out of logs and responses."""

    user: User
    edupage_session_id: str


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


async def get_auth_context(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> AuthContext:
    """Validate the JWT cookie and load the server-side session + user."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token is None:
        raise _unauthorized("Not authenticated.")

    claims = decode_access_token(token)
    if claims is None or "sid" not in claims:
        raise _unauthorized("Session is invalid or expired. Please log in again.")

    try:
        session_id = UUID(str(claims["sid"]))
    except ValueError:
        raise _unauthorized("Session is invalid. Please log in again.")

    session = await auth_service.get_active_session(db, session_id)
    if session is None:
        raise _unauthorized("Session is invalid or expired. Please log in again.")

    user = await db.get(User, session.user_id)
    if user is None:
        raise _unauthorized("Session is invalid. Please log in again.")

    edupage_cookie = auth_service.decrypt_session_cookie(session)
    if edupage_cookie is None:
        logger.warning("session cookie failed to decrypt: session=%s", session.id)
        raise _unauthorized("Session is invalid. Please log in again.")

    return AuthContext(user=user, edupage_session_id=edupage_cookie)


async def get_edupage_client(
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
) -> Edupage:
    """Rehydrate a ready-to-use Edupage instance from the stored session cookie."""
    try:
        return await edupage_service.get_client(
            ctx.edupage_session_id, ctx.user.subdomain, ctx.user.username
        )
    except EduPageAuthError as exc:
        raise _unauthorized(exc.message)
    except EduPageDataError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)
