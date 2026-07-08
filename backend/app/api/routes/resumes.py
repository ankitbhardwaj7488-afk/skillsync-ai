from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user, require_roles
from app.core.config import settings
from app.database.session import get_db
from app.models.entities import Resume, Role, User
from app.services.resume_ai import analyze, extract_pdf

router = APIRouter(prefix="/resumes", tags=["Resumes"])


def serialize(item: Resume) -> dict:
    return {"id": item.id, "filename": item.filename, "ats_score": item.ats_score, "parsed_data": item.parsed_data, "strengths": item.strengths, "weaknesses": item.weaknesses, "suggestions": item.suggestions, "created_at": item.created_at}


@router.post("/upload", status_code=201)
async def upload(file: UploadFile = File(...), user: User = Depends(require_roles(Role.candidate, Role.admin)), db: AsyncSession = Depends(get_db)):
    if file.content_type != "application/pdf" or not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(415, "Only PDF resumes are accepted")
    content = await file.read(settings.max_resume_mb * 1024 * 1024 + 1)
    if len(content) > settings.max_resume_mb * 1024 * 1024: raise HTTPException(413, "Resume is too large")
    try: text = extract_pdf(content)
    except ValueError as exc: raise HTTPException(422, str(exc))
    result = analyze(text)
    resume = Resume(user_id=user.id, filename=file.filename, text_content=text, parsed_data=result["parsed_data"], ats_score=result["ats_score"], strengths=result["strengths"], weaknesses=result["weaknesses"], suggestions=result["suggestions"])
    db.add(resume); await db.commit(); await db.refresh(resume)
    return {**serialize(resume), "score_breakdown": result["score_breakdown"], "learning_roadmap": result["learning_roadmap"]}


@router.get("")
async def history(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    items = (await db.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc()))).all()
    return [serialize(x) for x in items]


@router.get("/latest")
async def latest(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    item = await db.scalar(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc()))
    if not item: raise HTTPException(404, "No resume uploaded yet")
    return serialize(item)

