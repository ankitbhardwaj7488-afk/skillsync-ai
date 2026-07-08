from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user, require_roles
from app.database.session import get_db
from app.models.entities import Application, Company, Job, Resume, Role, User
from app.schemas.api import ApplicationOut, CompanyUpsert, JobCreate, JobOut
from app.services.resume_ai import extract_skills, match

router = APIRouter(tags=["Jobs"])


async def owned_company(user: User, db: AsyncSession) -> Company:
    company = await db.scalar(select(Company).where(Company.owner_id == user.id))
    if not company: raise HTTPException(409, "Create your company profile first")
    return company


@router.get("/jobs", response_model=list[JobOut])
async def list_jobs(q: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    query = select(Job).where(Job.is_active.is_(True)).order_by(Job.created_at.desc())
    if q: query = query.where(or_(Job.title.ilike(f"%{q}%"), Job.description.ilike(f"%{q}%"), Job.location.ilike(f"%{q}%")))
    return (await db.scalars(query)).all()


@router.post("/companies")
async def upsert_company(data: CompanyUpsert, user: User = Depends(require_roles(Role.recruiter, Role.admin)), db: AsyncSession = Depends(get_db)):
    company = await db.scalar(select(Company).where(Company.owner_id == user.id))
    if company:
        for key, value in data.model_dump().items(): setattr(company, key, value)
    else:
        company = Company(owner_id=user.id, **data.model_dump()); db.add(company)
    await db.commit(); await db.refresh(company)
    return company


@router.post("/jobs", response_model=JobOut, status_code=201)
async def create_job(data: JobCreate, user: User = Depends(require_roles(Role.recruiter, Role.admin)), db: AsyncSession = Depends(get_db)):
    company = await owned_company(user, db)
    payload = data.model_dump(); payload["required_skills"] = data.required_skills or extract_skills(data.description)
    item = Job(company_id=company.id, **payload); db.add(item); await db.commit(); await db.refresh(item)
    return item


@router.put("/jobs/{job_id}", response_model=JobOut)
async def update_job(job_id: str, data: JobCreate, user: User = Depends(require_roles(Role.recruiter, Role.admin)), db: AsyncSession = Depends(get_db)):
    company = await owned_company(user, db); item = await db.get(Job, job_id)
    if not item or item.company_id != company.id: raise HTTPException(404, "Job not found")
    for key, value in data.model_dump().items(): setattr(item, key, value)
    await db.commit(); await db.refresh(item); return item


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str, user: User = Depends(require_roles(Role.recruiter, Role.admin)), db: AsyncSession = Depends(get_db)):
    company = await owned_company(user, db); item = await db.get(Job, job_id)
    if not item or item.company_id != company.id: raise HTTPException(404, "Job not found")
    await db.delete(item); await db.commit()


@router.post("/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=201)
async def apply(job_id: str, user: User = Depends(require_roles(Role.candidate)), db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job or not job.is_active: raise HTTPException(404, "Job not found")
    if await db.scalar(select(Application).where(Application.job_id == job_id, Application.candidate_id == user.id)): raise HTTPException(409, "You already applied")
    resume = await db.scalar(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc()))
    if not resume: raise HTTPException(409, "Upload a resume before applying")
    result = match(resume.text_content, job.description)
    item = Application(job_id=job.id, candidate_id=user.id, resume_id=resume.id, match_score=result["match_percentage"], match_explanation=result["explanation"])
    db.add(item); await db.commit(); await db.refresh(item); return item

