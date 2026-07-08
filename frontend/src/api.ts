export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export type Role = "candidate" | "recruiter" | "admin";
export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  headline?: string;
  location?: string;
  auth_provider: string;
  profile_picture?: string;
  email_verified: boolean;
  google_linked: boolean;
  linkedin_linked: boolean;
};
export type Job = {
  id: string;
  company_id: string;
  title: string;
  location: string;
  employment_type: string;
  description: string;
  required_skills: string[];
  salary_min?: number;
  salary_max?: number;
  created_at: string;
};

export const token = () => localStorage.getItem("access_token");
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Something went wrong");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function saveAuth(payload: {
  access_token: string;
  refresh_token: string;
  user: User;
}) {
  localStorage.setItem("access_token", payload.access_token);
  localStorage.setItem("refresh_token", payload.refresh_token);
  localStorage.setItem("user", JSON.stringify(payload.user));
}
export function clearAuth() {
  localStorage.clear();
}
