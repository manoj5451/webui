/**
 * src/pages/TableManagementScreen.tsx
 *
 * Module 4. TABLES.MANAGE is assigned to both Store Admin (defining
 * tables) and Cashier (updating status during service) — see
 * seed_rbac.py's comment on why this is one permission covering both,
 * matching PRODUCTS.MANAGE's own precedent. Both roles land on the
 * same screen; nothing here branches on role, since both need to see
 * the same table list either way.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useErrorDialog } from "../context/ErrorDialogContext";
import { useLanguage } from "../context/LanguageContext";
import { useCatalog } from "../hooks/useCatalog";
import * as catalogApi from "../api/catalogApi";
import type { TableOut } from "../api/catalogApi";
import AppShell from "../components/AppShell";
import { GLOSSY_BUTTON_PRIMARY, GLOSSY_BUTTON_SECONDARY, GLOSSY_CARD, GLOSSY_STATUS_TILE } from "../styles/uiEffects";
import { SkeletonListRow } from "../components/Skeleton";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]",
  occupied: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]",
  reserved: "bg-[var(--surface-2)] text-[var(--neutral-text)] border-[var(--neutral-border)]",
  bill_requested: "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)]",
};

// Translation keys, not literal text — matches the same pattern already
// used for NAV_SCREENS and PAYMENT_MODES, since this table is read by
// both the status tiles and the status-cycle toast, and having two
// separate ways of turning a status into display text would be exactly
// the kind of drift risk already hit once with the nav filter.
const STATUS_LABEL_KEYS: Record<string, string> = {
  open: "tables.status.open",
  occupied: "tables.status.occupied",
  reserved: "tables.status.reserved",
  bill_requested: "tables.status.bill_requested",
};

export default function TableManagementScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const storeId = user?.store_id ?? null;
  const { catalog, isLoading, error, reload } = useCatalog(storeId);
  const [tables, setTables] = useState<TableOut[] | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadTables = async () => {
    if (!storeId) return;
    setLoadingTables(true);
    try {
      setTables(await catalogApi.getTables(storeId));
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => { loadTables(); }, [storeId]);

  if (!storeId) return <AppShell><div className="p-8 text-sm text-[var(--danger)]">{t("products.noStoreAssigned")}</div></AppShell>;
  if (isLoading || !catalog) return <AppShell><div className="p-8 text-sm text-[var(--text-muted)]">{t("common.loading")}</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-sm text-[var(--danger)]">{error}</div></AppShell>;

  const { store } = catalog;

  const cycleStatus = async (table: TableOut) => {
    const order: TableOut["status"][] = ["open", "occupied", "bill_requested", "reserved"];
    const next = order[(order.indexOf(table.status) + 1) % order.length];
    await catalogApi.updateTable(table.table_id, { status: next });
    showToast(`${table.label} → ${t(STATUS_LABEL_KEYS[next])}`);
    loadTables();
  };


  return (
    <AppShell storeName={store.store_name}>
    <div className="bg-[var(--bg)] p-8">
      <div className="max-w-5xl mx-auto">
        {!store.has_cuisines ? (
          // Hard block, not a warning banner — this is what closes the
          // gap the nav-hiding fix alone couldn't: a Grocery Store
          // Admin typing /tables directly, or a stale bookmark, would
          // otherwise still reach a fully working screen for a concept
          // (tables) that doesn't apply to their store type at all.
          <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--text)] mb-1">{t("tables.notUsedTitle")}</p>
            <p className="text-sm text-[var(--text-muted)]">{t("tables.notUsedBody")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">{t("tables.title")}</h1>
                <p className="text-sm text-[var(--text-muted)]">{t("tables.subtitle")}</p>
              </div>
              <button
                onClick={() => setShowAddDialog(true)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
              >
                {t("tables.addTables")}
              </button>
            </div>

            {loadingTables ? (
              <div className={`rounded-xl p-5 ${GLOSSY_CARD}`}>
                <SkeletonListRow />
                <SkeletonListRow />
                <SkeletonListRow />
              </div>
            ) : tables && tables.length === 0 ? (
              <div className={`text-center py-16 rounded-xl ${GLOSSY_CARD}`}>
                <p className="text-sm text-[var(--text-muted)] mb-3">{t("tables.noneYet")}</p>
                <button onClick={() => setShowAddDialog(true)} className="text-sm font-medium text-[var(--accent)] hover:underline">
                  {t("tables.addFirst")}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {tables?.map((tbl) => (
                  <button
                    key={tbl.table_id}
                    onClick={() => cycleStatus(tbl)}
                    className={`rounded-xl border p-4 text-left ${STATUS_STYLES[tbl.status]} ${GLOSSY_STATUS_TILE}`}
                  >
                    <div className="font-semibold mb-1">{tbl.label}</div>
                    <div className="text-xs opacity-80 mb-2">{tbl.seats != null ? `${tbl.seats} ${t("tables.seats")}` : "—"}</div>
                    <div className="text-[10px] uppercase tracking-wide font-semibold">{t(STATUS_LABEL_KEYS[tbl.status])}</div>
                  </button>
                ))}
              </div>

            )}

            {showAddDialog && (
              <AddTablesDialog
                storeId={storeId}
                onClose={() => setShowAddDialog(false)}
                onSaved={() => {
                  setShowAddDialog(false);
                  loadTables();
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
    </AppShell>
  );
}

function AddTablesDialog({
  storeId, onClose, onSaved,
}: {
  storeId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const { showError } = useErrorDialog();
  const { t } = useLanguage();
  // Two modes in one dialog, per the earlier discussion: bulk quick-setup
  // for "how many tables does this place have" on day one, and a single
  // add for everything after (a name that isn't just "Table N", or
  // adding one more table later).
  const [mode, setMode] = useState<"bulk" | "single">("bulk");
  const [count, setCount] = useState("10");
  const [startNumber, setStartNumber] = useState("1");
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("");
  const [saving, setSaving] = useState(false);

  const submitBulk = async () => {
    const n = parseInt(count, 10);
    const start = parseInt(startNumber, 10) || 1;
    if (!n || n < 1 || n > 200) {
      showError(t("tables.dialog.countError"));
      return;
    }
    setSaving(true);
    try {
      // Sequential, not Promise.all — keeps this simple and gives a
      // predictable table order; 200 tables at most, so the extra
      // round-trip latency here is a one-time setup cost, not a
      // day-to-day one.
      for (let i = 0; i < n; i++) {
        await catalogApi.createTable(storeId, { label: `Table ${start + i}` });
      }
      showToast(`${n} ${t("tables.toast.tablesCreated")}`);
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tables.dialog.bulkError"));
    } finally {
      setSaving(false);
    }
  };

  const submitSingle = async () => {
    if (!label) return;
    setSaving(true);
    try {
      await catalogApi.createTable(storeId, { label, seats: seats ? parseInt(seats, 10) : undefined });
      showToast(`${label} ${t("tables.toast.created")}`);
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tables.dialog.singleError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t("tables.dialog.title")}</h2>

        <div className="flex rounded-lg border border-[var(--border)] p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md ${mode === "bulk" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
          >
            {t("tables.dialog.quickSetup")}
          </button>
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md ${mode === "single" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
          >
            {t("tables.dialog.addOne")}
          </button>
        </div>

        {mode === "bulk" ? (
          <>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              {t("tables.dialog.bulkExplain")}
            </p>
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("tables.dialog.numberOfTables")}</label>
            <input
              value={count}
              onChange={(e) => setCount(e.target.value)}
              type="number"
              min={1}
              max={200}
              className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono"
            />
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("tables.dialog.startingNumber")}</label>
            <input
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              type="number"
              min={1}
              className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono"
            />
          </>
        ) : (
          <>
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("tables.dialog.label")}</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("tables.dialog.labelPlaceholder")}
              className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm"
            />
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("tables.dialog.seatsOptional")}</label>
            <input
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              type="number"
              className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono"
            />
          </>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_SECONDARY}`}>{t("tables.dialog.cancel")}</button>
          <button
            disabled={saving || (mode === "single" && !label)}
            onClick={mode === "bulk" ? submitBulk : submitSingle}
            className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
          >
            {saving ? t("tables.dialog.creating") : t("tables.dialog.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
