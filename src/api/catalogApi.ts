/**
 * src/api/catalogApi.ts
 *
 * Module 3 update: the gap noted below is closed — GET/POST
 * /catalog/tax-rates now exist, so Add/Edit Product can offer a real
 * tax-rate picker instead of omitting tax rate entirely.
 *
 * Item.tax_rate_percent stays as a read-only display value (the backend
 * resolves it from the related TaxRate row). The new tax_rate_id field
 * is what's actually sent on create/update — a foreign key, not a
 * percent, matching how the backend models it.
 */

import { API_BASE_URL, handle, jsonHeaders, authHeaders } from "./client";

export interface TaxRateOut {
  tax_rate_id: number;
  name: string;
  rate_percent: number;
}

export interface TaxRateCreateInput {
  name: string;
  rate_percent: number;
}

export interface StoreInfoOut {
  store_id: number;
  store_name: string;
  store_type_code: string;
  store_type_name: string;
  tracks_inventory: boolean;
  has_cuisines: boolean;
  requires_barcode: boolean;
}

export interface CategoryOut {
  category_id: number;
  parent_category_id: number | null;
  category_type: "PRODUCT_CATEGORY" | "CUISINE" | "MENU_CATEGORY";
  name: string;
  color_hex: string | null;
  image_path: string | null;
  display_order: number;
}

export interface InventoryOut {
  quantity_on_hand: number;
  reorder_level: number;
  unit_of_measure: string;
}

export interface ItemOut {
  item_id: number;
  category_id: number;
  item_type_code: "PRODUCT" | "MENU_ITEM";
  name: string;
  description: string | null;
  price: number;
  procurement_price: number | null;
  profit_percent: number | null;
  barcode: string | null;
  tax_rate_id: number | null;
  tax_rate_percent: number | null;
  is_available: boolean;
  image_path: string | null;
  display_order: number;
  attributes: Record<string, unknown> | null;
  inventory: InventoryOut | null;
}

// Aliases for the shorter names used elsewhere (BillingScreen.tsx,
// ProductInventoryScreen.tsx) — those files were written expecting
// `Item`/`Category` as the export names, which never actually existed
// here (only `ItemOut`/`CategoryOut` did). This was a real, pre-existing
// bug: it wouldn't have surfaced in `npm run dev` (esbuild skips type
// checking) but would have failed `npm run build` (`tsc && vite build`).
// Fixed here rather than renaming every import site, since this is the
// single source of truth both files were already assuming existed.
export type Item = ItemOut;
export type Category = CategoryOut;

export interface CatalogTreeOut {
  store: StoreInfoOut;
  categories: CategoryOut[];
  items: ItemOut[];
}

export interface ItemCreateInput {
  category_id: number;
  item_type_code: "PRODUCT" | "MENU_ITEM";
  name: string;
  description?: string;
  // Module 3: provide EITHER price directly, OR both procurement_price
  // and profit_percent and let the backend compute price. Matches the
  // real ItemCreate schema — price is now optional there too, enforced
  // by the service layer rather than the schema itself.
  price?: number;
  procurement_price?: number;
  profit_percent?: number;
  barcode?: string;
  tax_rate_id?: number;
  is_available?: boolean;
  initial_quantity?: number;
}

export interface ItemUpdateInput {
  category_id?: number;
  name?: string;
  description?: string;
  price?: number;
  procurement_price?: number;
  profit_percent?: number;
  barcode?: string;
  tax_rate_id?: number;
  is_available?: boolean;
  is_active?: boolean;
}

export async function getStoreInfo(storeId: number): Promise<StoreInfoOut> {
  // Lightweight — just the store record, not the full catalog tree.
  // The backend endpoint (GET /stores/{id}) has existed since Module 1;
  // this is the first frontend function to actually wrap it directly.
  // Needed so AppShell can check has_cuisines without every screen it
  // wraps being required to have already loaded the full catalog.
  const res = await fetch(`${API_BASE_URL}/api/v1/stores/${storeId}`, {
    headers: authHeaders(),
  });
  return handle<StoreInfoOut>(res);
}

export async function getCatalogTree(storeId: number): Promise<CatalogTreeOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/tree?store_id=${storeId}`, {
    headers: authHeaders(),
  });
  return handle<CatalogTreeOut>(res);
}

export async function listItems(storeId: number, categoryId?: number): Promise<ItemOut[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/catalog/items`);
  url.searchParams.set("store_id", String(storeId));
  if (categoryId != null) url.searchParams.set("category_id", String(categoryId));
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handle<ItemOut[]>(res);
}

export async function createItem(storeId: number, payload: ItemCreateInput): Promise<ItemOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/items?store_id=${storeId}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<ItemOut>(res);
}

export async function updateItem(itemId: number, payload: ItemUpdateInput): Promise<ItemOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/items/${itemId}`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<ItemOut>(res);
}

export async function deactivateItem(itemId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/items/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handle<void>(res);
}

export async function adjustInventory(itemId: number, delta: number, reason: string): Promise<InventoryOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/items/${itemId}/inventory/adjust`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ delta, reason }),
  });
  return handle<InventoryOut>(res);
}

export interface CategoryCreateInput {
  parent_category_id?: number;
  category_type: "PRODUCT_CATEGORY" | "CUISINE" | "MENU_CATEGORY";
  name: string;
  display_order?: number;
}

export async function createCategory(storeId: number, payload: CategoryCreateInput): Promise<CategoryOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/categories?store_id=${storeId}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<CategoryOut>(res);
}

export async function getTaxRates(storeId: number): Promise<TaxRateOut[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/tax-rates?store_id=${storeId}`, {
    headers: authHeaders(),
  });
  return handle<TaxRateOut[]>(res);
}

export async function createTaxRate(storeId: number, payload: TaxRateCreateInput): Promise<TaxRateOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/tax-rates?store_id=${storeId}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<TaxRateOut>(res);
}

export interface TableOut {
  table_id: number;
  store_id: number;
  label: string;
  seats: number | null;
  status: "open" | "occupied" | "reserved" | "bill_requested";
}

export interface TableCreateInput {
  label: string;
  seats?: number;
}

export interface TableUpdateInput {
  label?: string;
  seats?: number;
  status?: "open" | "occupied" | "reserved" | "bill_requested";
}

export async function getTables(storeId: number): Promise<TableOut[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/tables?store_id=${storeId}`, {
    headers: authHeaders(),
  });
  return handle<TableOut[]>(res);
}

export async function createTable(storeId: number, payload: TableCreateInput): Promise<TableOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/tables?store_id=${storeId}`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<TableOut>(res);
}

export async function updateTable(tableId: number, payload: TableUpdateInput): Promise<TableOut> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/tables/${tableId}`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<TableOut>(res);
}
