/**
 * src/api/authApi.ts
 *
 * Types below are a direct match of app/modules/auth/schemas.py —
 * verified against the real file, not inferred.
 */

import { API_BASE_URL, handle, jsonHeaders } from "./client";

export interface UserOut {
  user_id: number;
  username: string;
  role_code: string;
  role_name: string;
  store_id: number | null;
  permissions: string[];
  must_change_password: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: UserOut;
}

export async function login(username: string, password: string, terminalId?: number): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, terminal_id: terminalId ?? null }),
  });
  return handle<LoginResponse>(res);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  return handle<void>(res);
}
