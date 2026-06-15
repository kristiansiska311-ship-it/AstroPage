from typing import Annotated

from edupage_api import Edupage
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_edupage_client
from app.schemas.canteen import (
    BulkSignupRequest,
    BulkSignupResponse,
    MealDayOut,
    OrderRequest,
    OrderResponse,
)
from app.services import canteen_service
from app.services.edupage_service import EduPageDataError

router = APIRouter(prefix="/canteen", tags=["canteen"])


@router.get("/meals", response_model=list[MealDayOut])
async def meals(
    edupage: Annotated[Edupage, Depends(get_edupage_client)],
    weeks: Annotated[int, Query(ge=1, le=canteen_service.MAX_WEEKS)] = 3,
) -> list[MealDayOut]:
    """Mon–Fri menus starting from the current week, `weeks` weeks ahead."""
    try:
        return await canteen_service.list_meals(edupage, weeks)
    except EduPageDataError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)


@router.post("/order", response_model=OrderResponse)
async def order(
    payload: OrderRequest,
    edupage: Annotated[Edupage, Depends(get_edupage_client)],
) -> OrderResponse:
    """Order a menu choice for a day, or sign off when `choice` is null."""
    try:
        ordered = await canteen_service.order(edupage, payload.date, payload.choice)
    except EduPageDataError as exc:
        code = (
            status.HTTP_404_NOT_FOUND
            if exc.reason == "no_meal"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
            if exc.reason == "bad_choice"
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=code, detail=exc.message)
    return OrderResponse(date=payload.date, ordered_meal=ordered)


@router.post("/bulk-signup", response_model=BulkSignupResponse)
async def bulk_signup(
    payload: BulkSignupRequest,
    edupage: Annotated[Edupage, Depends(get_edupage_client)],
) -> BulkSignupResponse:
    """Auto-register for `preferred_choice` across the next `days_count` days."""
    try:
        updated, skipped = await canteen_service.bulk_signup(
            edupage, payload.days_count, payload.preferred_choice
        )
    except EduPageDataError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)
    return BulkSignupResponse(updated_days=updated, skipped_days=skipped)
