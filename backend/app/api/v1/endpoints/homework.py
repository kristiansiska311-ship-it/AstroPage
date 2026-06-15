from typing import Annotated

from edupage_api import Edupage
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context, get_edupage_client
from app.db.session import get_session
from app.schemas.homework import DraftResponse, GenerateAiRequest, HomeworkItem
from app.services import homework_service
from app.services.ai_service import AiUnavailableError
from app.services.edupage_service import EduPageDataError

router = APIRouter(prefix="/homework", tags=["homework"])


@router.get("/list", response_model=list[HomeworkItem])
async def list_homework(
    edupage: Annotated[Edupage, Depends(get_edupage_client)],
) -> list[HomeworkItem]:
    """All homework assignments from the student's EduPage timeline."""
    try:
        assignments = await homework_service.list_assignments(edupage)
    except EduPageDataError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)
    return [
        HomeworkItem(
            id=a.id,
            subject=a.subject,
            title=a.title,
            description=a.description,
            teacher=a.teacher,
            assigned_at=a.assigned_at,
            due_date=a.due_date,
            is_done=a.is_done,
        )
        for a in assignments
    ]


@router.post("/generate-ai", response_model=DraftResponse)
async def generate_ai(
    payload: GenerateAiRequest,
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
    edupage: Annotated[Edupage, Depends(get_edupage_client)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> DraftResponse:
    """Draft the assignment with the AI assistant and cache the result.

    The response is always a draft for the student to review and edit —
    nothing is submitted to EduPage.
    """
    try:
        draft, cached = await homework_service.generate_draft(
            db, ctx.user, edupage, payload.assignment_id, force=payload.force
        )
    except EduPageDataError as exc:
        code = (
            status.HTTP_404_NOT_FOUND if exc.reason == "not_found" else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=code, detail=exc.message)
    except AiUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=exc.message)

    return DraftResponse(
        assignment_id=draft.assignment_id,
        draft=draft.ai_response,
        cached=cached,
        created_at=draft.created_at,
    )
