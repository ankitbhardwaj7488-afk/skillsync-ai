import { useEffect, useRef, useState } from "react";
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
  const [data, setData] = useState<DashboardData | null>(null),
    [jobs, setJobs] = useState<Job[]>([]),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const candidate = user.role === "candidate";
  const load = () => {
    api<DashboardData>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
    api<Job[]>("/jobs")
      .then(setJobs)
      .catch(() => {});
  };
  useEffect(load, []);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      await api("/resumes/upload", { method: "POST", body });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
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
          <button>
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
          <a className="active">
            <LayoutDashboard />
            Overview
          </a>
          <a>
            <FileText />
            {candidate ? "My resume" : "Jobs"}
          </a>
          <a>
            <BriefcaseBusiness>{}</BriefcaseBusiness>
            {candidate ? "Opportunities" : "Pipeline"}
          </a>
          <a>
            <Target />
            {candidate ? "Applications" : "Talent search"}
          </a>
          {!candidate && (
            <a>
              <UsersRound />
              Candidates
            </a>
          )}
          <small>MANAGE</small>
          <a>
            <CircleUserRound />
            Profile
          </a>
          <a>
            <Settings />
            Settings
          </a>
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
              placeholder={
                candidate
                  ? "Search roles and companies…"
                  : "Search candidates, skills…"
              }
            />
            <kbd>⌘ K</kbd>
          </div>
          <button className="icon-button">
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
          <div className="header-user">
            <b>{user.full_name}</b>
            <small>{candidate ? "Candidate" : "Recruiter"}</small>
          </div>
          <ChevronDown />
        </header>
        <main className="dashboard-content">
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
                  ? "Here’s how your career momentum is looking today."
                  : "Your hiring pipeline is moving. Here’s the signal."}
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
                  {uploading ? "Analyzing…" : "Upload resume"}
                </button>
              </>
            ) : (
              <button className="button primary">
                <BriefcaseBusiness />
                Post a job
              </button>
            )}
          </div>
          {error && <div className="dash-error">{error}</div>}
          {candidate ? (
            <CandidateView data={data} jobs={jobs} />
          ) : (
            <RecruiterView data={data} />
          )}
          <ConnectedAccounts user={user} />
        </main>
      </section>
    </div>
  );
}

function ConnectedAccounts({ user }: { user: User }) {
  async function manage(provider: "google" | "linkedin", linked: boolean) {
    if (linked) {
      await api(`/auth/oauth/${provider}/link`, { method: "DELETE" });
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
}: {
  data: DashboardData | null;
  jobs: Job[];
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
            <a>View full analysis →</a>
          </div>
        </div>
        <Metric
          icon={<BriefcaseBusiness />}
          label="ACTIVE APPLICATIONS"
          value={data?.application_count || 0}
          sub="Track your pipeline"
        />
        <Metric
          icon={<Target />}
          label="PROFILE MATCHES"
          value={jobs.length}
          sub="Roles selected for you"
        />
      </div>
      <div className="dash-grid">
        <div className="panel skills-panel">
          <div className="panel-head">
            <div>
              <small>YOUR SIGNAL</small>
              <h2>Skills recruiters can see</h2>
            </div>
            <a>Manage skills</a>
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
                  "We’ll identify tailored improvements after your first resume upload."}
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
          <button>
            Get started <span>→</span>
          </button>
        </div>
      </div>
      <div className="panel role-panel">
        <div className="panel-head">
          <div>
            <small>CURATED FOR YOU</small>
            <h2>Roles that match your momentum</h2>
          </div>
          <a>Explore all roles →</a>
        </div>
        <div className="role-row">
          {jobs.slice(0, 3).map((j, i) => (
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
              <b>
                {Math.max(73, 94 - i * 7)}%<small>match</small>
              </b>
            </article>
          ))}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="metric-card panel">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>
        {sub} <b>→</b>
      </p>
    </div>
  );
}

function RecruiterView({ data }: { data: DashboardData | null }) {
  return (
    <>
      <div className="recruit-stats">
        <Metric
          icon={<BriefcaseBusiness />}
          label="ACTIVE JOBS"
          value={data?.active_jobs || 0}
          sub="View open roles"
        />
        <Metric
          icon={<UsersRound />}
          label="TOTAL APPLICANTS"
          value={data?.applicants || 0}
          sub="Review pipeline"
        />
        <Metric
          icon={<Target />}
          label="STRONG MATCHES"
          value={
            data?.top_candidates?.filter((x) => x.match_score >= 80).length || 0
          }
          sub="See ranked talent"
        />
      </div>
      <div className="dash-grid">
        <div className="panel pipeline">
          <div className="panel-head">
            <div>
              <small>HIRING OVERVIEW</small>
              <h2>Candidate pipeline</h2>
            </div>
            <a>View full pipeline →</a>
          </div>
          <div className="empty-state">
            <span>
              <UsersRound />
            </span>
            <h3>Your strongest candidates will appear here</h3>
            <p>
              Create a company profile and post your first role to start
              building an intelligent shortlist.
            </p>
            <button className="button primary">Create company</button>
          </div>
        </div>
        <div className="panel next-panel">
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
          <p>Try “Python backend engineer with AWS and fintech experience.”</p>
          <button>
            Search talent <span>→</span>
          </button>
        </div>
      </div>
    </>
  );
}
