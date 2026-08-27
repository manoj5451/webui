/**
 * src/navConfig.ts
 *
 * Single source of truth for the app's nav structure — extracted from
 * HomeScreen (which previously had its own private copy) so AppShell
 * can share the exact same list rather than maintaining a second copy
 * that could quietly drift out of sync with it.
 */

export interface NavScreen {
  path: string;
  label: string;
  permission: string;
}

export const NAV_SCREENS: NavScreen[] = [
  { path: "/billing", label: "Billing", permission: "SALES.CREATE" },
  { path: "/stores", label: "Store Management", permission: "STORES.VIEW_ALL" },
  { path: "/products", label: "Products & Inventory", permission: "PRODUCTS.MANAGE" },
];
