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
  /** A translation key (see src/i18n/translations.ts), not literal
   * display text — AppShell and HomeScreen both call t(s.label) rather
   * than rendering this directly, so the nav updates with the
   * selected language automatically. */
  label: string;
  permission: string;
  /** Only shown when the current user's store has has_cuisines=true.
   * TABLES.MANAGE is assigned to Store Admin and Cashier regardless of
   * store type (it's one permission covering both table definition and
   * status updates — see seed_rbac.py), so permission alone isn't
   * enough to keep this hidden for Grocery stores; AppShell checks
   * this flag against the store's actual type as well. */
  restaurantOnly?: boolean;
}

export const NAV_SCREENS: NavScreen[] = [
  { path: "/billing", label: "nav.billing", permission: "SALES.CREATE" },
  { path: "/stores", label: "nav.stores", permission: "STORES.VIEW_ALL" },
  { path: "/products", label: "nav.products", permission: "PRODUCTS.MANAGE" },
  { path: "/tables", label: "nav.tables", permission: "TABLES.MANAGE", restaurantOnly: true },
];
