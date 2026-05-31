from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get("/health")
def api_health_check() -> dict[str, str]:
    return {"status": "ok"}
