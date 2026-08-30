/**
 * src/hooks/useAvailableScreens.ts
 *
 * Single source of truth for "which nav screens can this user actually
 * see" — permission AND store type both apply. Extracted after finding
 * this logic duplicated in two places: AppShell's sidebar had it, and
 * HomeScreen's own welcome-page button list had a separate copy that
 * only checked permission, not restaurantOnly/store type. Fixing one
 * copy and missing the other is exactly the risk noted when NAV_SCREENS
 * itself was first extracted — this closes that gap for good by
 * leaving only one place this filter is written, not two that can
 * silently drift apart again.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { NAV_SCREENS, type NavScreen } from "../navConfig";
import * as catalogApi from "../api/catalogApi";

export function useAvailableScreens(): NavScreen[] {
  const { user, hasPermission } = useAuth();
  const [hasCuisines, setHasCuisines] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.store_id) return; // Super User has no single store — fine, they hold no restaurantOnly permissions anyway
    catalogApi.getStoreInfo(user.store_id)
      .then((info) => setHasCuisines(info.has_cuisines))
      .catch(() => setHasCuisines(null));
  }, [user?.store_id]);

  return NAV_SCREENS.filter((s) => {
    if (!hasPermission(s.permission)) return false;
    // null (still loading) is treated as "not confirmed restaurant" —
    // a restaurantOnly entry stays hidden until this resolves, rather
    // than flashing visible-then-hidden once the real value arrives.
    if (s.restaurantOnly && hasCuisines !== true) return false;
    return true;
  });
}
