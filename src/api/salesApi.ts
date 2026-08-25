/**
 * src/api/salesApi.ts
 *
 * Matches the corrected, verified Module 1 backend (app/modules/sales/).
 */

import { API_BASE_URL, handle, jsonHeaders, authHeaders } from "./client";

export type PaymentMethod = "card" | "debit" | "cash" | "wallet" | "gift" | "split";

export interface SaleLineInput {
  item_id: number;
  quantity: number;
}

export interface CreateSaleRequest {
  store_id: number;
  terminal_id?: string;
  table_id?: number; // unused until Table Management exists server-side
  lines: SaleLineInput[];
  payment_method: PaymentMethod;
  tendered_amount?: number;
  split_card_amount?: number;
  split_cash_amount?: number;
  gift_card_code?: string;
}

export interface SaleLineOut {
  sale_line_id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface SaleOut {
  sale_id: number;
  receipt_number: string;
  store_id: number;
  cashier_user_id: number;
  subtotal: number;
  tax_total: number;
  total: number;
  payment_method: PaymentMethod | null;
  tendered_amount: number | null;
  change_amount: number | null;
  split_card_amount: number | null;
  split_cash_amount: number | null;
  gift_card_code: string | null;
  status: string;
  created_date: string;
  lines: SaleLineOut[];
}

export async function createSale(payload: CreateSaleRequest): Promise<SaleOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/sales`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<SaleOut>(res);
}

export async function getSale(saleId: number): Promise<SaleOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/sales/${saleId}`, { headers: authHeaders() });
  return handle<SaleOut>(res);
}

export async function listSales(storeId: number, status?: string): Promise<SaleOut[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/sales`);
  url.searchParams.set("store_id", String(storeId));
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handle<SaleOut[]>(res);
}

export async function voidSale(saleId: number, reason: string): Promise<SaleOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/sales/${saleId}/void`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handle<SaleOut>(res);
}
