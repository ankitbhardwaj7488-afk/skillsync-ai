# SkillSync AI

SkillSync AI is a full-stack applicant tracking and career-intelligence platform. Candidates receive explainable resume analysis, ATS scoring, skill-gap guidance, job matching, and application tracking. Recruiters can operate a company workspace, publish roles, rank applicants, semantically search the talent pool, and generate tailored interview kits.

## What is included

- Candidate, recruiter, and admin RBAC with short-lived JWT access tokens and refresh tokens
- Email/password, Google OAuth 2.0, and LinkedIn OAuth 2.0 authentication with account linking
- Strict PDF-only resume ingestion with size limits and text validation
- Deterministic, explainable ATS scoring that remains useful without an external AI subscription
- Resume-to-job matching with matched/missing skills and a readable rationale
- Recruiter company profiles, job CRUD, applications, ranked candidate pipeline, and semantic search
- Responsive React/TypeScript interface with separate candidate and recruiter experiences
- Async SQLAlchemy persistence; SQLite for zero-config local use and PostgreSQL in production
- Docker Compose, Render/Vercel manifests, health checks, tests, and GitHub Actions CI
- Interactive API reference at `/docs` and ReDoc at `/redoc`

## Run locally

### Docker (recommended)

```bash
docker compose up --build
```

Open the app at `http://localhost:5173` and API docs at `http://localhost:8000/docs`.

### Native development

Backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The backend defaults to a local SQLite database. Copy `backend/.env.example` to `backend/.env` to use PostgreSQL, OpenAI, or a non-default frontend origin. Set `VITE_API_URL` for a deployed frontend.

### Social authentication

Create OAuth apps in Google Cloud Console and the LinkedIn Developer Portal, then set the backend environment variables from `backend/.env.example`.

- Google callback: `http://localhost:8000/api/v1/auth/oauth/google/callback`
- LinkedIn callback: `http://localhost:8000/api/v1/auth/oauth/linkedin/callback`
- Frontend API URL: `VITE_API_URL=http://localhost:8000/api/v1`

Google uses the Authorization Code Flow with `openid email profile`. LinkedIn uses OpenID Connect `openid profile email`; work experience, education, and public skills are stored when the LinkedIn API returns them, but LinkedIn requires separate product approval and scopes for many extended profile fields.

For an existing database, run migrations before starting the updated API:

```bash
cd backend
alembic upgrade head
```

## Architecture

```text
frontend/                 React + TypeScript product UI
backend/app/
  api/routes/             Thin HTTP controllers and role gates
  core/                   Configuration and JWT/password security
  database/               Async session lifecycle
  models/                 SQLAlchemy domain entities
  schemas/                Validated API contracts
  services/               Resume parsing and explainable AI logic
backend/tests/             Unit tests
.github/workflows/         CI quality gates
```

The resume engine is deliberately deterministic by default: scores are auditable, development does not require a paid key, and core hiring workflows never fail due to a third-party model outage. `OPENAI_API_KEY` and `OPENAI_MODEL` are already configuration-safe extension points for richer narrative feedback.

## Production checklist

1. Provision Neon PostgreSQL and set its async connection URL as `DATABASE_URL` on Render.
2. Deploy `render.yaml`, set `FRONTEND_URL` to the Vercel domain, and verify `/health`.
3. Import the repository into Vercel and set `VITE_API_URL` to the Render API URL plus `/api/v1`.
4. Rotate `SECRET_KEY`, use managed secrets, set OAuth client secrets, enable `SECURE_COOKIES=true` on HTTPS, enable database backups, and connect an email provider for password-reset delivery.
5. Run database migrations as a release command before horizontally scaling the API.

## Security notes

Passwords are one-way hashed, API inputs are validated, authorization is checked at resource boundaries, files are constrained by type and size, and internal exceptions are not exposed to clients. Logout clears client credentials; production token revocation can be added with Redis if immediate server-side invalidation is required.
