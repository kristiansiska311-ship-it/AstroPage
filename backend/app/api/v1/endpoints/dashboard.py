from typing import Annotated

from edupage_api import Edupage
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_edupage_client
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service
from app.services.edupage_service import EduPageDataError

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def summary(
    edupage: Annotated[Edupage, Depends(get_edupage_client)],
) -> DashboardSummary:
    """Today's timetable plus homework counts for the home-page widgets."""
    try:
        return await dashboard_service.build_summary(edupage)
    except EduPageDataError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)
