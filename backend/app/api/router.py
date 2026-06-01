from fastapi import APIRouter

from app.api.routes import auth, fund, health, members, play_sessions


api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(fund.router)
api_router.include_router(health.router)
api_router.include_router(members.router)
api_router.include_router(play_sessions.router)