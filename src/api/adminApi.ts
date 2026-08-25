/**
 * src/api/adminApi.ts
 *
 * Verified against the real app/modules/admin/schemas.py and router.py.
 * No user-management endpoints exist beyond store-creation
 * auto-provisioning — that's why there's no listUsers()/createUser()
 * here. StoreCreateResponse.provisioned_users is the ONLY place temp
 * passwords ever appear; the backend's own comment says they're not
 * retrievable again, so the UI must show them prominently, once.
 */

import { API_BASE_URL, handle, jsonHeaders, authHeaders } from "./client";

export interface BusinessHoursInput {
  day_of_week: number;
  open_time?: string;
  close_time?: string;
  is_closed?: boolean;
}

export interface StoreCreateInput {
  store_name: string;
  store_code: string;
  store_type_code: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  business_hours?: BusinessHoursInput[];
}

export interface StoreUpdateInput {
  store_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  is_active?: boolean;
}

export interface StoreOut {
  store_id: number;
  store_name: string;
  store_code: string | null;
  store_type_code: string;
  store_type_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
  is_active: boolean;
}

export interface ProvisionedUserOut {
  username: string;
  role_code: string;
  temp_password: string;
}

export interface StoreCreateResponse {
  store: StoreOut;
  provisioned_users: ProvisionedUserOut[];
}

export async function listStores(): Promise<StoreOut[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/stores`, { headers: authHeaders() });
  return handle<StoreOut[]>(res);
}

export async function getStore(storeId: number): Promise<StoreOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/stores/${storeId}`, { headers: authHeaders() });
  return handle<StoreOut>(res);
}

export async function createStore(payload: StoreCreateInput): Promise<StoreCreateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/stores`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<StoreCreateResponse>(res);
}

export async function updateStore(storeId: number, payload: StoreUpdateInput): Promise<StoreOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/stores/${storeId}`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<StoreOut>(res);
}

export async function activateStore(storeId: number): Promise<StoreOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/stores/${storeId}/activate`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handle<StoreOut>(res);
}

export async function deactivateStore(storeId: number): Promise<StoreOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/stores/${storeId}/deactivate`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handle<StoreOut>(res);
}
