from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.database.session import get_db
from app.models.entities import Application, Company, Job, Resume, Role, User

router = APIRouter(tags=["Dashboards"])


@router.get("/dashboard")
async def dashboard(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if user.role == Role.candidate:
        latest = await db.scalar(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc()))
        applications = (await db.scalars(select(Application).where(Application.candidate_id == user.id).order_by(Application.applied_at.desc()))).all()
        return {"role": "candidate", "resume_score": latest.ats_score if latest else 0, "skills": latest.parsed_data.get("skills", []) if latest else [], "suggestions": latest.suggestions if latest else [], "applications": applications, "application_count": len(applications)}
    company = await db.scalar(select(Company).where(Company.owner_id == user.id))
    if not company: return {"role": "recruiter", "company": None, "posted_jobs": 0, "applicants": 0, "top_candidates": []}
    jobs = (await db.scalars(select(Job).where(Job.company_id == company.id))).all(); ids = [j.id for j in jobs]
    apps = (await db.scalars(select(Application).where(Application.job_id.in_(ids)).order_by(Application.match_score.desc()))).all() if ids else []
    return {"role": "recruiter", "company": company, "posted_jobs": len(jobs), "applicants": len(apps), "active_jobs": sum(j.is_active for j in jobs), "top_candidates": apps[:5]}


@router.get("/applications")
async def applications(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if user.role == Role.candidate:
        return (await db.scalars(select(Application).where(Application.candidate_id == user.id).order_by(Application.applied_at.desc()))).all()
    company = await db.scalar(select(Company).where(Company.owner_id == user.id))
    if not company: return []
    job_ids = select(Job.id).where(Job.company_id == company.id)
    return (await db.scalars(select(Application).where(Application.job_id.in_(job_ids)).order_by(Application.match_score.desc()))).all()

