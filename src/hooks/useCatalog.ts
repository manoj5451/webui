/**
 * src/hooks/useCatalog.ts
 */

import { useEffect, useState, useCallback } from "react";
import * as catalogApi from "../api/catalogApi";
import type { CatalogTreeOut } from "../api/catalogApi";

export function useCatalog(storeId: number | null) {
  const [catalog, setCatalog] = useState<CatalogTreeOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (storeId == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const tree = await catalogApi.getCatalogTree(storeId);
      setCatalog(tree);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog.");
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { catalog, isLoading, error, reload };
}
