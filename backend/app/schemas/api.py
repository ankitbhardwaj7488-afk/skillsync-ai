from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.entities import ApplicationStatus, Role


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=72)
    role: Role = Role.candidate


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    role: Role
    headline: str | None = None
    location: str | None = None
    auth_provider: str = "email"
    profile_picture: str | None = None
    email_verified: bool = False
    google_linked: bool = False
    linkedin_linked: bool = False


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    location: str = "Remote"
    employment_type: str = "Full-time"
    description: str = Field(min_length=20)
    required_skills: list[str] = []
    salary_min: int | None = None
    salary_max: int | None = None


class JobOut(ORMModel):
    id: str
    company_id: str
    title: str
    location: str
    employment_type: str
    description: str
    required_skills: list[str]
    salary_min: int | None
    salary_max: int | None
    is_active: bool
    created_at: datetime


class CompanyUpsert(BaseModel):
    name: str
    website: str | None = None
    description: str | None = None
    industry: str | None = None
    size: str | None = None


class ApplicationOut(ORMModel):
    id: str
    job_id: str
    candidate_id: str
    resume_id: str | None
    status: ApplicationStatus
    match_score: float
    match_explanation: str | None
    applied_at: datetime


class StatusUpdate(BaseModel):
    status: ApplicationStatus


class SemanticSearch(BaseModel):
    query: str = Field(min_length=3)
    limit: int = Field(default=10, ge=1, le=50)


class InterviewRequest(BaseModel):
    resume_text: str
    job_description: str
