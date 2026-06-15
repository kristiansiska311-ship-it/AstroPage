from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_auth_context
from app.db.session import get_session
from app.schemas.settings import AiPromptOut, AiPromptUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/ai-prompt", response_model=AiPromptOut)
async def get_ai_prompt(
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
) -> AiPromptOut:
    return AiPromptOut(custom_ai_prompt=ctx.user.custom_ai_prompt)


@router.put("/ai-prompt", response_model=AiPromptOut)
async def update_ai_prompt(
    payload: AiPromptUpdate,
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
    db: Annotated[AsyncSession, Depends(get_session)],
) -> AiPromptOut:
    """Set the student's custom AI rules. The study-assistant constraint is
    always appended at generation time and cannot be removed here."""
    prompt = payload.custom_ai_prompt
    ctx.user.custom_ai_prompt = prompt.strip() if prompt and prompt.strip() else None
    db.add(ctx.user)
    await db.commit()
    return AiPromptOut(custom_ai_prompt=ctx.user.custom_ai_prompt)
