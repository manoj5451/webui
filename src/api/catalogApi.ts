/**
 * src/api/catalogApi.ts
 *
 * Verified against the real app/modules/catalog/{router,schemas}.py.
 * Two things worth noting since they shape what this frontend can and
 * can't do:
 *
 * - Item.tax_rate_percent is present in ItemOut for DISPLAY (the backend
 *   resolves it from a related TaxRate row), but ItemCreate/ItemUpdate
 *   take a tax_rate_id, not a percent. There's no endpoint to list
 *   available TaxRate rows for a store, so this frontend can't offer a
 *   tax-rate picker yet — Add/Edit Product below omits tax rate entirely
 *   rather than fake a selector with nothing real to populate it.
 */

import { API_BASE_URL, handle, jsonHeaders, authHeaders } from "./client";

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
  barcode: string | null;
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
  price: number;
  barcode?: string;
  is_available?: boolean;
  initial_quantity?: number;
}

export interface ItemUpdateInput {
  category_id?: number;
  name?: string;
  description?: string;
  price?: number;
  barcode?: string;
  is_available?: boolean;
  is_active?: boolean;
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
