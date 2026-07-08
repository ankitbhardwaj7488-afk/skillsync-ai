import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.router import api_router
from app.core.config import settings
from app.core.security import decode_token
from app.database.session import engine
from app.models.entities import Base

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", description="AI-powered applicant tracking and career intelligence platform", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix=settings.api_prefix)


@app.middleware("http")
async def token_validation_middleware(request: Request, call_next):
    raw_token = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        raw_token = auth.split(" ", 1)[1]
    elif request.cookies.get("access_token"):
        raw_token = request.cookies["access_token"]
    if raw_token:
        try:
            request.state.user_id = decode_token(raw_token)
        except ValueError:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})
    return await call_next(request)


@app.get("/health", tags=["System"])
async def health(): return {"status": "healthy", "service": settings.app_name}


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    logging.exception("Unhandled request error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred"})
