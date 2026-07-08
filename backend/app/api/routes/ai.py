from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user, require_roles
from app.database.session import get_db
from app.models.entities import Resume, Role, User
from app.schemas.api import InterviewRequest, SemanticSearch
from app.services.resume_ai import analyze, interview_questions, match, semantic_score

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/resume-analysis")
async def resume_analysis(data: InterviewRequest, _: User = Depends(current_user)):
    return analyze(data.resume_text)


@router.post("/match-resume")
async def match_resume(data: InterviewRequest, _: User = Depends(current_user)):
    return match(data.resume_text, data.job_description)


@router.post("/generate-interview-questions")
async def generate(data: InterviewRequest, _: User = Depends(current_user)):
    return interview_questions(data.resume_text, data.job_description)


@router.post("/semantic-search")
async def search(data: SemanticSearch, _: User = Depends(require_roles(Role.recruiter, Role.admin)), db: AsyncSession = Depends(get_db)):
    resumes = (await db.scalars(select(Resume))).all()
    ranked = sorted(({"resume_id": r.id, "candidate_id": r.user_id, "name": r.parsed_data.get("name", "Candidate"), "skills": r.parsed_data.get("skills", []), "score": semantic_score(data.query, r.text_content)} for r in resumes), key=lambda x: x["score"], reverse=True)
    return ranked[:data.limit]

