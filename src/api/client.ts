/**
 * src/api/client.ts
 *
 * Shared by every api/*.ts file. Backend is FastAPI on localhost:8000
 * (confirmed against the real project's CORS config in app/main.py,
 * which allows localhost:5173 and localhost:3000 — this dev server
 * runs on 5173 via vite.config.ts).
 */

export const API_BASE_URL = "http://localhost:8000";

export async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    // FastAPI's HTTPException serializes as { detail: "..." } — confirmed
    // against every router in the real backend (auth, catalog, admin, sales).
    const body = await res.json().catch(() => ({ detail: `Request failed (${res.status}).` }));
    throw new Error(body.detail ?? `Request failed (${res.status}).`);
  }
  // 204 No Content (e.g. change-password, deactivate_item) has no body.
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem("smartpos_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...authHeaders() };
}
