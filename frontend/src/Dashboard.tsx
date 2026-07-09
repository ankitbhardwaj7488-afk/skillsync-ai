import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Target,
  UploadCloud,
  UsersRound,
  X,
} from "lucide-react";
import { API_BASE, api, Job, User } from "./api";

type DashboardData = {
  role: string;
  resume_score?: number;
  skills?: string[];
  suggestions?: string[];
  application_count?: number;
  posted_jobs?: number;
  applicants?: number;
  active_jobs?: number;
  top_candidates?: { id: string; match_score: number }[];
  company?: { name: string } | null;
};

type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  match_score: number;
  applied_at: string;
};

type ModalKind = null | "company" | "job" | "applications" | "profile";

function Ring({ score }: { score: number }) {
  return (
    <div
      className="score-ring"
      style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}
    >
      <div>
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

export default function Dashboard({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const input = useRef<HTMLInputElement>(null);
  const candidate = user.role === "candidate";

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) =>
      [
        job.title,
        job.location,
        job.employment_type,
        job.description,
        ...job.required_skills,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [jobs, query]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const load = () => {
    api<DashboardData>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
    api<Job[]>("/jobs")
      .then(setJobs)
      .catch(() => {});
    api<Application[]>("/applications")
      .then(setApplications)
      .catch(() => {});
  };

  useEffect(load, []);

  function go(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      await api("/resumes/upload", { method: "POST", body });
      flash("Resume uploaded and analyzed.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function apply(job: Job) {
    setError("");
    try {
      await api(`/jobs/${job.id}/apply`, { method: "POST" });
      flash(`Applied to ${job.title}.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply");
    }
  }

  async function saveCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name") || ""),
      website: String(form.get("website") || "") || null,
      industry: String(form.get("industry") || "") || null,
      size: String(form.get("size") || "") || null,
      description: String(form.get("description") || "") || null,
    };
    try {
      await api("/companies", { method: "POST", body: JSON.stringify(body) });
      setModal(null);
      flash("Company profile saved.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save company");
    }
  }

  async function saveJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const skills = String(form.get("required_skills") || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const body = {
      title: String(form.get("title") || ""),
      location: String(form.get("location") || "Remote"),
      employment_type: String(form.get("employment_type") || "Full-time"),
      description: String(form.get("description") || ""),
      required_skills: skills,
      salary_min: form.get("salary_min")
        ? Number(form.get("salary_min"))
        : null,
      salary_max: form.get("salary_max")
        ? Number(form.get("salary_max"))
        : null,
    };
    try {
      await api("/jobs", { method: "POST", body: JSON.stringify(body) });
      setModal(null);
      flash("Job posted.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post job");
    }
  }

  return (
    <div className="app-shell">
      <aside>
        <div className="dash-logo">
          <span>
            <Sparkles />
          </span>
          SkillSync <b>AI</b>
        </div>
        <div className="workspace">
          <small>WORKSPACE</small>
          <button onClick={() => go("overview")}>
            <span className="work-icon">{candidate ? "C" : "H"}</span>
            <div>
              <b>{candidate ? "My Career" : "Hiring team"}</b>
              <small>
                {candidate
                  ? "Candidate workspace"
                  : data?.company?.name || "Recruiter workspace"}
              </small>
            </div>
            <ChevronDown />
          </button>
        </div>
        <nav className="side-nav">
          <small>MENU</small>
          <button className="active" onClick={() => go("overview")}>
            <LayoutDashboard />
            Overview
          </button>
          <button
            onClick={() => (candidate ? input.current?.click() : go("jobs"))}
          >
            <FileText />
            {candidate ? "My resume" : "Jobs"}
          </button>
          <button onClick={() => go(candidate ? "jobs" : "pipeline")}>
            <BriefcaseBusiness />
            {candidate ? "Opportunities" : "Pipeline"}
          </button>
          <button
            onClick={() =>
              candidate ? setModal("applications") : go("search")
            }
          >
            <Target />
            {candidate ? "Applications" : "Talent search"}
          </button>
          {!candidate && (
            <button onClick={() => setModal("applications")}>
              <UsersRound />
              Candidates
            </button>
          )}
          <small>MANAGE</small>
          <button onClick={() => setModal("profile")}>
            <CircleUserRound />
            Profile
          </button>
          <button onClick={() => go("settings")}>
            <Settings />
            Settings
          </button>
        </nav>
        <div className="side-upgrade">
          <Sparkles />
          <b>{candidate ? "Unlock your potential" : "Hire with clarity"}</b>
          <p>
            {candidate
              ? "Get personalized insights for every application."
              : "Let AI surface the strongest evidence."}
          </p>
        </div>
        <button className="logout" onClick={onLogout}>
          <LogOut />
          Log out
        </button>
      </aside>
      <section className="dash-main">
        <header>
          <div className="mobile-brand">SkillSync AI</div>
          <div className="header-search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go(candidate ? "jobs" : "search");
              }}
              placeholder={
                candidate
                  ? "Search roles and companies..."
                  : "Search jobs, candidates, skills..."
              }
            />
            <kbd>Enter</kbd>
          </div>
          <button
            className="icon-button"
            onClick={() => flash("No new notifications.")}
          >
            <Bell />
            <i></i>
          </button>
          <span className="header-avatar">
            {user.full_name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)}
          </span>
          <button className="header-user" onClick={() => setModal("profile")}>
            <b>{user.full_name}</b>
            <small>{candidate ? "Candidate" : "Recruiter"}</small>
          </button>
          <ChevronDown />
        </header>
        <main className="dashboard-content" id="overview">
          <div className="welcome">
            <div>
              <span>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <h1>Good to see you, {user.full_name.split(" ")[0]}.</h1>
              <p>
                {candidate
                  ? "Here is how your career momentum is looking today."
                  : "Your hiring pipeline is moving. Here is the signal."}
              </p>
            </div>
            {candidate ? (
              <>
                <input
                  ref={input}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => upload(e.target.files?.[0])}
                />
                <button
                  className="button primary"
                  onClick={() => input.current?.click()}
                  disabled={uploading}
                >
                  <UploadCloud />
                  {uploading ? "Analyzing..." : "Upload resume"}
                </button>
              </>
            ) : (
              <button
                className="button primary"
                onClick={() => setModal("job")}
              >
                <BriefcaseBusiness />
                Post a job
              </button>
            )}
          </div>
          {notice && <div className="dash-success">{notice}</div>}
          {error && <div className="dash-error">{error}</div>}
          {candidate ? (
            <CandidateView
              data={data}
              jobs={filteredJobs}
              applications={applications}
              onApply={apply}
              onUpload={() => input.current?.click()}
              onShowApplications={() => setModal("applications")}
            />
          ) : (
            <RecruiterView
              data={data}
              jobs={filteredJobs}
              query={query}
              onCreateCompany={() => setModal("company")}
              onPostJob={() => setModal("job")}
              onShowApplications={() => setModal("applications")}
            />
          )}
          <div id="settings">
            <ConnectedAccounts user={user} flash={flash} />
          </div>
        </main>
      </section>
      {modal && (
        <DashboardModal
          title={modalTitle(modal)}
          onClose={() => setModal(null)}
        >
          {modal === "company" && <CompanyForm onSubmit={saveCompany} />}
          {modal === "job" && <JobForm onSubmit={saveJob} />}
          {modal === "applications" && (
            <ApplicationsList
              applications={applications}
              jobs={jobs}
              candidate={candidate}
            />
          )}
          {modal === "profile" && <ProfileCard user={user} />}
        </DashboardModal>
      )}
    </div>
  );
}

function modalTitle(modal: Exclude<ModalKind, null>) {
  return {
    company: "Company profile",
    job: "Post a job",
    applications: "Applications",
    profile: "Profile",
  }[modal];
}

function DashboardModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="dash-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function CompanyForm({
  onSubmit,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="dash-form" onSubmit={onSubmit}>
      <label>
        Company name
        <input name="name" required minLength={2} placeholder="Acme Hiring" />
      </label>
      <label>
        Website
        <input name="website" placeholder="https://example.com" />
      </label>
      <label>
        Industry
        <input name="industry" placeholder="Software" />
      </label>
      <label>
        Company size
        <input name="size" placeholder="11-50" />
      </label>
      <label>
        Description
        <textarea name="description" placeholder="What does your company do?" />
      </label>
      <button className="button primary">Save company</button>
    </form>
  );
}

function JobForm({
  onSubmit,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="dash-form" onSubmit={onSubmit}>
      <label>
        Job title
        <input
          name="title"
          required
          minLength={2}
          placeholder="Backend Engineer"
        />
      </label>
      <label>
        Location
        <input name="location" defaultValue="Remote" />
      </label>
      <label>
        Employment type
        <input name="employment_type" defaultValue="Full-time" />
      </label>
      <label>
        Required skills, comma separated
        <input
          name="required_skills"
          placeholder="Python, FastAPI, PostgreSQL"
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          required
          minLength={20}
          placeholder="Describe the role, responsibilities, and requirements."
        />
      </label>
      <div className="form-row">
        <label>
          Salary min
          <input name="salary_min" type="number" min={0} />
        </label>
        <label>
          Salary max
          <input name="salary_max" type="number" min={0} />
        </label>
      </div>
      <button className="button primary">Publish job</button>
    </form>
  );
}

function ApplicationsList({
  applications,
  jobs,
  candidate,
}: {
  applications: Application[];
  jobs: Job[];
  candidate: boolean;
}) {
  if (!applications.length) {
    return (
      <div className="empty-state compact">
        <h3>No applications yet</h3>
        <p>
          {candidate
            ? "Apply to a matching role after uploading your resume."
            : "Applications will appear after candidates apply to your jobs."}
        </p>
      </div>
    );
  }
  return (
    <div className="list-panel">
      {applications.map((app) => {
        const job = jobs.find((item) => item.id === app.job_id);
        return (
          <div key={app.id} className="list-row">
            <div>
              <b>{job?.title || "Application"}</b>
              <small>
                {app.status} · {Math.round(app.match_score)}% match
              </small>
            </div>
            <span>{new Date(app.applied_at).toLocaleDateString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProfileCard({ user }: { user: User }) {
  return (
    <div className="profile-summary">
      {user.profile_picture ? (
        <img src={user.profile_picture} alt="" />
      ) : (
        <span>{user.full_name[0]}</span>
      )}
      <div>
        <h3>{user.full_name}</h3>
        <p>{user.email}</p>
        <small>
          {user.role} ·{" "}
          {user.email_verified ? "Email verified" : "Email not verified"}
        </small>
      </div>
    </div>
  );
}

function ConnectedAccounts({
  user,
  flash,
}: {
  user: User;
  flash: (message: string) => void;
}) {
  async function manage(provider: "google" | "linkedin", linked: boolean) {
    if (linked) {
      await api(`/auth/oauth/${provider}/link`, { method: "DELETE" });
      flash(`${provider === "google" ? "Google" : "LinkedIn"} disconnected.`);
      window.location.reload();
      return;
    }
    window.location.href = `${API_BASE}/auth/oauth/${provider}/link`;
  }
  return (
    <div className="panel connected-panel">
      <div className="panel-head">
        <div>
          <small>PROFILE SETTINGS</small>
          <h2>Connected login methods</h2>
        </div>
      </div>
      <p>
        Link Google or LinkedIn to keep sign-in flexible while using the same
        SkillSync account.
      </p>
      <div>
        <button onClick={() => manage("google", user.google_linked)}>
          <b>G</b>
          <span>
            <strong>Google</strong>
            <small>{user.google_linked ? "Connected" : "Not connected"}</small>
          </span>
          <i>{user.google_linked ? "Unlink" : "Link"}</i>
        </button>
        <button onClick={() => manage("linkedin", user.linkedin_linked)}>
          <b className="li">in</b>
          <span>
            <strong>LinkedIn</strong>
            <small>
              {user.linkedin_linked ? "Connected" : "Import profile data"}
            </small>
          </span>
          <i>{user.linkedin_linked ? "Unlink" : "Link"}</i>
        </button>
      </div>
    </div>
  );
}

function CandidateView({
  data,
  jobs,
  applications,
  onApply,
  onUpload,
  onShowApplications,
}: {
  data: DashboardData | null;
  jobs: Job[];
  applications: Application[];
  onApply: (job: Job) => void;
  onUpload: () => void;
  onShowApplications: () => void;
}) {
  const score = data?.resume_score || 0;
  return (
    <>
      <div className="metric-grid">
        <div className="score-card panel">
          <div>
            <small>RESUME STRENGTH</small>
            <Ring score={score} />
          </div>
          <div>
            <h3>
              {score
                ? score >= 80
                  ? "Excellent foundation"
                  : "Room to stand out"
                : "Upload your resume"}
            </h3>
            <p>
              {score
                ? "Your resume is structured well. A few focused changes can take it further."
                : "Get your ATS score and a personalized action plan."}
            </p>
            <button
              className="inline-action"
              onClick={() =>
                document
                  .getElementById("skills")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              View full analysis →
            </button>
          </div>
        </div>
        <Metric
          icon={<BriefcaseBusiness />}
          label="ACTIVE APPLICATIONS"
          value={applications.length || data?.application_count || 0}
          sub="Track your pipeline"
          onClick={onShowApplications}
        />
        <Metric
          icon={<Target />}
          label="PROFILE MATCHES"
          value={jobs.length}
          sub="Roles selected for you"
          onClick={() =>
            document
              .getElementById("jobs")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>
      <div className="dash-grid" id="skills">
        <div className="panel skills-panel">
          <div className="panel-head">
            <div>
              <small>YOUR SIGNAL</small>
              <h2>Skills recruiters can see</h2>
            </div>
            <button className="inline-action" onClick={onUpload}>
              Manage skills
            </button>
          </div>
          <div className="skill-cloud">
            {(data?.skills?.length
              ? data.skills
              : ["Upload a resume to extract skills"]
            ).map((x, i) => (
              <span className={i < 3 ? "strong" : ""} key={x}>
                {x}
                {i < 3 && data?.skills?.length ? <CheckCircle2 /> : null}
              </span>
            ))}
          </div>
          <div className="tip">
            <Sparkles />
            <div>
              <b>Make your strongest skills undeniable</b>
              <p>
                {data?.suggestions?.[0] ||
                  "We will identify tailored improvements after your first resume upload."}
              </p>
            </div>
          </div>
        </div>
        <div className="panel next-panel">
          <div className="panel-head">
            <div>
              <small>NEXT BEST ACTION</small>
              <h2>Build momentum</h2>
            </div>
          </div>
          <div className="next-score">01</div>
          <h3>{score ? "Quantify your recent impact" : "Add your resume"}</h3>
          <p>
            {score
              ? "Add metrics to two recent experience bullets to make your impact tangible."
              : "Upload a PDF and SkillSync will build your career intelligence profile."}
          </p>
          <button onClick={onUpload}>
            Get started <span>→</span>
          </button>
        </div>
      </div>
      <div className="panel role-panel" id="jobs">
        <div className="panel-head">
          <div>
            <small>CURATED FOR YOU</small>
            <h2>Roles that match your momentum</h2>
          </div>
          <button
            className="inline-action"
            onClick={() =>
              document
                .getElementById("jobs")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Explore all roles →
          </button>
        </div>
        <div className="role-row">
          {jobs.slice(0, 6).map((j, i) => (
            <article key={j.id}>
              <span className={`company-tile t${i}`}>{j.title[0]}</span>
              <div>
                <h3>{j.title}</h3>
                <p>
                  {j.location} · {j.employment_type}
                </p>
                <div>
                  {j.required_skills.slice(0, 3).map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                <button className="inline-action" onClick={() => onApply(j)}>
                  Apply now
                </button>
              </div>
              <b>
                {Math.max(73, 94 - i * 7)}%<small>match</small>
              </b>
            </article>
          ))}
          {!jobs.length && <p className="empty-copy">No active jobs yet.</p>}
        </div>
      </div>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="metric-card panel" onClick={onClick}>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>
        {sub} <b>→</b>
      </p>
    </Tag>
  );
}

function RecruiterView({
  data,
  jobs,
  query,
  onCreateCompany,
  onPostJob,
  onShowApplications,
}: {
  data: DashboardData | null;
  jobs: Job[];
  query: string;
  onCreateCompany: () => void;
  onPostJob: () => void;
  onShowApplications: () => void;
}) {
  return (
    <>
      <div className="recruit-stats" id="jobs">
        <Metric
          icon={<BriefcaseBusiness />}
          label="ACTIVE JOBS"
          value={data?.active_jobs || jobs.length || 0}
          sub="View open roles"
          onClick={() =>
            document
              .getElementById("job-list")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <Metric
          icon={<UsersRound />}
          label="TOTAL APPLICANTS"
          value={data?.applicants || 0}
          sub="Review pipeline"
          onClick={onShowApplications}
        />
        <Metric
          icon={<Target />}
          label="STRONG MATCHES"
          value={
            data?.top_candidates?.filter((x) => x.match_score >= 80).length || 0
          }
          sub="See ranked talent"
          onClick={onShowApplications}
        />
      </div>
      <div className="dash-grid" id="pipeline">
        <div className="panel pipeline">
          <div className="panel-head">
            <div>
              <small>HIRING OVERVIEW</small>
              <h2>Candidate pipeline</h2>
            </div>
            <button className="inline-action" onClick={onShowApplications}>
              View full pipeline →
            </button>
          </div>
          <div className="empty-state">
            <span>
              <UsersRound />
            </span>
            <h3>
              {data?.company ? "Pipeline ready" : "Create your company profile"}
            </h3>
            <p>
              {data?.company
                ? "Post jobs and applications will appear here automatically."
                : "Create a company profile and post your first role to start building an intelligent shortlist."}
            </p>
            <button
              className="button primary"
              onClick={data?.company ? onPostJob : onCreateCompany}
            >
              {data?.company ? "Post a job" : "Create company"}
            </button>
          </div>
        </div>
        <div className="panel next-panel" id="search">
          <div className="panel-head">
            <div>
              <small>AI TALENT SEARCH</small>
              <h2>Find the right signal</h2>
            </div>
          </div>
          <div className="search-illustration">
            <Search />
            <Sparkles />
          </div>
          <h3>Search beyond keywords</h3>
          <p>
            {query
              ? `Filtering jobs by "${query}".`
              : "Use the search box above to filter jobs and skills."}
          </p>
          <button
            onClick={() =>
              document
                .querySelector<HTMLInputElement>(".header-search input")
                ?.focus()
            }
          >
            Search talent <span>→</span>
          </button>
        </div>
      </div>
      <div className="panel role-panel" id="job-list">
        <div className="panel-head">
          <div>
            <small>OPEN ROLES</small>
            <h2>Your jobs</h2>
          </div>
          <button className="inline-action" onClick={onPostJob}>
            Post another job →
          </button>
        </div>
        <div className="role-row">
          {jobs.slice(0, 6).map((j, i) => (
            <article key={j.id}>
              <span className={`company-tile t${i}`}>{j.title[0]}</span>
              <div>
                <h3>{j.title}</h3>
                <p>
                  {j.location} · {j.employment_type}
                </p>
                <div>
                  {j.required_skills.slice(0, 3).map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {!jobs.length && (
            <p className="empty-copy">
              No jobs yet. Create a company, then post your first role.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
