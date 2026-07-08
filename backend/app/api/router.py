from fastapi import APIRouter
from app.api.routes import ai, auth, dashboards, jobs, resumes

api_router = APIRouter()
for router in (auth.router, resumes.router, jobs.router, dashboards.router, ai.router):
    api_router.include_router(router)

