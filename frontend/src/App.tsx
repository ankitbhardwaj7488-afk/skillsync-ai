import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleUserRound,
  FileSearch,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { API_BASE, api, clearAuth, Job, Role, saveAuth, User } from "./api";
import Dashboard from "./Dashboard";

type AuthMode = "login" | "register" | null;

const features = [
  {
    icon: FileSearch,
    title: "Resume intelligence",
    text: "Parse every detail, surface strengths, and turn each resume into clear next steps.",
  },
  {
    icon: BrainCircuit,
    title: "Explainable matching",
    text: "Rank candidates by evidence, not guesswork—with transparent skill-by-skill reasoning.",
  },
  {
    icon: Search,
    title: "Semantic talent search",
    text: "Describe who you need in plain English. SkillSync finds the people who fit.",
  },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`logo ${light ? "light" : ""}`}>
      <span className="logo-mark">
        <Sparkles size={17} />
      </span>
      <span>
        SkillSync <b>AI</b>
      </span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.38 4.27 5.47v6.27zM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.1 20.45H3.54V9H7.1v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z"
      />
    </svg>
  );
}

function AuthModal({
  mode,
  onClose,
  onAuth,
}: {
  mode: Exclude<AuthMode, null>;
  onClose: () => void;
  onAuth: (u: User) => void;
}) {
  const [tab, setTab] = useState(mode);
  const [role, setRole] = useState<Role>("candidate");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const social = (provider: "google" | "linkedin") => {
    const params = new URLSearchParams({ role });
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize?${params}`;
  };
  const forgot = async () => {
    setError("");
    try {
      await api("/auth/forgot-password", { method: "POST" });
      setError("If that account exists, reset instructions have been sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send reset email");
    }
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const body =
        tab === "login"
          ? { email: f.get("email"), password: f.get("password") }
          : {
              full_name: f.get("name"),
              email: f.get("email"),
              password: f.get("password"),
              role,
            };
      const result = await api<{
        access_token: string;
        refresh_token: string;
        user: User;
      }>(`/auth/${tab}`, { method: "POST", body: JSON.stringify(body) });
      saveAuth(result);
      onAuth(result.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>
          <X size={20} />
        </button>
        <Logo />
        <div className="auth-tabs">
          <button
            className={tab === "login" ? "active" : ""}
            onClick={() => setTab("login")}
          >
            Log in
          </button>
          <button
            className={tab === "register" ? "active" : ""}
            onClick={() => setTab("register")}
          >
            Create account
          </button>
        </div>
        <h2>
          {tab === "login" ? "Welcome back" : "Your next chapter starts here"}
        </h2>
        <p>
          {tab === "login"
            ? "Continue to your SkillSync workspace."
            : "Join candidates and hiring teams doing better work."}
        </p>
        {tab === "register" && (
          <div className="role-picker">
            <button
              type="button"
              className={role === "candidate" ? "selected" : ""}
              onClick={() => setRole("candidate")}
            >
              <CircleUserRound />
              I'm a candidate
            </button>
            <button
              type="button"
              className={role === "recruiter" ? "selected" : ""}
              onClick={() => setRole("recruiter")}
            >
              <BriefcaseBusiness />
              I'm hiring
            </button>
          </div>
        )}
        <div className="social-auth">
          <button type="button" onClick={() => social("google")}>
            <GoogleIcon />
            Continue with Google
          </button>
          <button type="button" onClick={() => social("linkedin")}>
            <LinkedInIcon />
            Continue with LinkedIn
          </button>
        </div>
        <div className="auth-divider">
          <span>or continue with email</span>
        </div>
        <form onSubmit={submit}>
          {tab === "register" && (
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                placeholder="Avery Johnson"
              />
            </label>
          )}
          <label>
            Work email
            <input
              name="email"
              type="email"
              required
              placeholder="you@company.com"
            />
          </label>
          <label>
            <span className="password-label">
              Password
              {tab === "login" && (
                <button type="button" className="forgot" onClick={forgot}>
                  Forgot password?
                </button>
              )}
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="button primary wide" disabled={busy}>
            {busy
              ? "One moment…"
              : tab === "login"
                ? "Log in"
                : "Create my account"}
            <ArrowRight size={17} />
          </button>
        </form>
        <small>By continuing, you agree to our Terms and Privacy Policy.</small>
      </div>
    </div>
  );
}

function Landing({ onAuth }: { onAuth: (m: Exclude<AuthMode, null>) => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    api<Job[]>("/jobs")
      .then(setJobs)
      .catch(() => {});
  }, []);
  return (
    <div className="landing">
      <nav>
        <Logo />
        <div className="nav-links">
          <a href="#platform">Platform</a>
          <a href="#teams">For teams</a>
          <a href="#jobs">Jobs</a>
        </div>
        <div className="nav-actions">
          <button className="text-button" onClick={() => onAuth("login")}>
            Log in
          </button>
          <button className="button dark" onClick={() => onAuth("register")}>
            Get started <ArrowRight size={16} />
          </button>
        </div>
        <Menu className="mobile-menu" />
      </nav>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span></span> The intelligence behind better hires
          </div>
          <h1>
            Talent, meet
            <br />
            <em>your match.</em>
          </h1>
          <p>
            One intelligent workspace for candidates to stand out and teams to
            hire with confidence.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() => onAuth("register")}
            >
              Start for free <ArrowRight size={18} />
            </button>
            <button
              className="button ghost"
              onClick={() =>
                document
                  .querySelector("#platform")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore the platform <ChevronRight size={18} />
            </button>
          </div>
          <div className="trust-row">
            <span>
              <Check />
              No credit card
            </span>
            <span>
              <Check />
              Set up in minutes
            </span>
            <span>
              <ShieldCheck />
              Your data stays yours
            </span>
          </div>
          <div className="hero-visual">
            <div className="glow"></div>
            <div className="profile-card">
              <div className="mini-head">
                <span className="avatar">AM</span>
                <div>
                  <b>Alex Morgan</b>
                  <small>Senior Product Engineer</small>
                </div>
                <span className="match-pill">94% match</span>
              </div>
              <div className="skills">
                <span>React</span>
                <span>TypeScript</span>
                <span>Node.js</span>
                <span>AWS</span>
              </div>
              <div className="score-line">
                <span>Role alignment</span>
                <b>Exceptional</b>
              </div>
              <div className="progress">
                <i></i>
              </div>
            </div>
            <div className="float-card score">
              <span>ATS SCORE</span>
              <strong>92</strong>
              <small>Top 8% of applicants</small>
            </div>
            <div className="float-card shortlist">
              <span className="check-circle">
                <Check />
              </span>
              <div>
                <b>Shortlist ready</b>
                <small>12 strong matches found</small>
              </div>
            </div>
          </div>
        </section>
        <section className="social-proof">
          <span>Trusted by modern teams building what’s next</span>
          <div>
            <b>northstar</b>
            <b>VERTEX</b>
            <b>Arcwise</b>
            <b>MONO</b>
            <b>kinetic</b>
          </div>
        </section>
        <section className="feature-section" id="platform">
          <div className="section-kicker">ONE PLATFORM. BOTH SIDES.</div>
          <h2>
            Hiring works better
            <br />
            when everyone wins.
          </h2>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }, i) => (
              <article key={title}>
                <span className={`feature-icon c${i}`}>
                  <Icon />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <a href="#">
                    Learn more <ArrowRight size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="split-section" id="teams">
          <div className="split-copy">
            <div className="section-kicker">FOR HIRING TEAMS</div>
            <h2>
              See the signal.
              <br />
              <em>Skip the noise.</em>
            </h2>
            <p>
              SkillSync turns a crowded pipeline into a clear, confident
              shortlist—without losing the human judgment that matters.
            </p>
            <ul>
              <li>
                <Check />
                Evidence-backed candidate rankings
              </li>
              <li>
                <Check />
                Bias-aware, explainable recommendations
              </li>
              <li>
                <Check />
                Interview kits tailored to every role
              </li>
            </ul>
            <button className="button dark" onClick={() => onAuth("register")}>
              Build your team <ArrowRight />
            </button>
          </div>
          <div className="analytics-card">
            <div className="card-title">
              <div>
                <small>CANDIDATE PIPELINE</small>
                <h3>Senior Backend Engineer</h3>
              </div>
              <span>24 candidates</span>
            </div>
            {[
              ["Maya Chen", "96", "Python · AWS · System Design"],
              ["Daniel Kim", "91", "Go · Kubernetes · PostgreSQL"],
              ["Riya Shah", "87", "Python · Docker · Redis"],
            ].map((x, i) => (
              <div className="candidate-row" key={x[0]}>
                <b className="rank">0{i + 1}</b>
                <span className={`avatar a${i}`}>
                  {x[0]
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <strong>{x[0]}</strong>
                  <small>{x[2]}</small>
                </div>
                <span className="row-score">
                  {x[1]}
                  <small>%</small>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="jobs-preview" id="jobs">
          <div>
            <div className="section-kicker">OPPORTUNITIES</div>
            <h2>
              Your next move,
              <br />
              made clearer.
            </h2>
          </div>
          <div className="job-list">
            {(jobs.length
              ? jobs.slice(0, 3)
              : [
                  {
                    id: "1",
                    title: "Product Engineer",
                    location: "Remote",
                    employment_type: "Full-time",
                    required_skills: ["React", "TypeScript"],
                  },
                  {
                    id: "2",
                    title: "AI Platform Engineer",
                    location: "Bengaluru",
                    employment_type: "Full-time",
                    required_skills: ["Python", "FastAPI"],
                  },
                  {
                    id: "3",
                    title: "Product Designer",
                    location: "Hybrid",
                    employment_type: "Full-time",
                    required_skills: ["Figma", "Research"],
                  },
                ]
            ).map((j) => (
              <div className="job-row" key={j.id}>
                <span className="company-tile">{j.title[0]}</span>
                <div>
                  <b>{j.title}</b>
                  <small>
                    {j.location} · {j.employment_type}
                  </small>
                </div>
                <div className="job-skills">
                  {j.required_skills.slice(0, 2).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <button onClick={() => onAuth("register")}>
                  <ArrowRight />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <Logo light />
        <p>Intelligent hiring. Human decisions.</p>
        <span>© 2026 SkillSync AI</span>
      </footer>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [auth, setAuth] = useState<AuthMode>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/oauth/callback" && params.get("error")) {
      setAuth("login");
    }
    api<User>("/auth/me")
      .then((u) => {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        if (window.location.pathname === "/oauth/callback") {
          window.history.replaceState({}, "", "/");
        }
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      });
  }, []);
  if (user)
    return (
      <Dashboard
        user={user}
        onLogout={() => {
          clearAuth();
          setUser(null);
        }}
      />
    );
  return (
    <>
      <Landing onAuth={setAuth} />
      {auth && (
        <AuthModal
          mode={auth}
          onClose={() => setAuth(null)}
          onAuth={(u) => {
            setUser(u);
            setAuth(null);
          }}
        />
      )}
    </>
  );
}
