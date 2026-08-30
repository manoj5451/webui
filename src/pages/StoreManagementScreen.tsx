import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useErrorDialog } from "../context/ErrorDialogContext";
import { useLanguage } from "../context/LanguageContext";
import * as adminApi from "../api/adminApi";
import type { StoreOut, ProvisionedUserOut } from "../api/adminApi";
import AppShell from "../components/AppShell";
import { GLOSSY_BUTTON_PRIMARY, GLOSSY_BUTTON_SECONDARY, GLOSSY_CARD } from "../styles/uiEffects";
import { SkeletonListRow } from "../components/Skeleton";

export default function StoreManagementScreen() {
  const { showToast } = useToast();
  const { showError } = useErrorDialog();
  const { t } = useLanguage();
  const [stores, setStores] = useState<StoreOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [justProvisioned, setJustProvisioned] = useState<ProvisionedUserOut[] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setStores(await adminApi.listStores());
    } catch (e) {
      showError(e instanceof Error ? e.message : t("stores.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (store: StoreOut) => {
    try {
      if (store.is_active) await adminApi.deactivateStore(store.store_id);
      else await adminApi.activateStore(store.store_id);
      showToast(`${store.store_name} ${store.is_active ? t("stores.deactivated") : t("stores.activated")}`);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("stores.actionFailed"), "error");
    }
  };

  return (
    <AppShell>
    <div className="bg-[var(--bg)]">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">{t("stores.title")}</h1>
            <p className="text-sm text-[var(--text-muted)]">{stores.length} {t("stores.count")}</p>
          </div>
          <button onClick={() => setShowCreate(true)} className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>
            {t("stores.createStore")}
          </button>
        </div>

        {loading && (
          <div className={`rounded-xl p-5 ${GLOSSY_CARD}`}>
            <SkeletonListRow />
            <SkeletonListRow />
            <SkeletonListRow />
          </div>
        )}

        {!loading && (
          <div className={`rounded-xl overflow-hidden ${GLOSSY_CARD}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="px-5 py-3 font-medium">{t("stores.col.store")}</th>
                  <th className="px-5 py-3 font-medium">{t("stores.col.code")}</th>
                  <th className="px-5 py-3 font-medium">{t("stores.col.type")}</th>
                  <th className="px-5 py-3 font-medium">{t("stores.col.status")}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.store_id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3.5 font-medium text-[var(--text)]">{s.store_name}</td>
                    <td className="px-5 py-3.5 font-mono text-[var(--text-muted)]">{s.store_code ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">{s.store_type_name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}>
                        {s.is_active ? t("stores.active") : t("stores.inactive")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => toggleActive(s)} className="text-xs font-medium text-[var(--accent)] hover:underline">
                        {s.is_active ? t("stores.deactivate") : t("stores.activate")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateStoreModal
          onClose={() => setShowCreate(false)}
          onCreated={(users) => {
            setShowCreate(false);
            setJustProvisioned(users);
            load();
          }}
        />
      )}

      {justProvisioned && (
        <ProvisionedUsersModal users={justProvisioned} onClose={() => setJustProvisioned(null)} />
      )}
    </div>
    </AppShell>
  );
}

function CreateStoreModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: ProvisionedUserOut[]) => void }) {
  const { t } = useLanguage();
  const { showError } = useErrorDialog();
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [storeType, setStoreType] = useState<"GROCERY" | "RESTAURANT">("GROCERY");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await adminApi.createStore({
        store_name: storeName,
        store_code: storeCode,
        store_type_code: storeType,
      });
      onCreated(res.provisioned_users);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("stores.modal.couldNotCreate"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{t("stores.createStore")}</h2>
        <label className="text-xs font-medium text-[var(--text-muted)]">{t("stores.modal.storeName")}</label>
        <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm" />
        <label className="text-xs font-medium text-[var(--text-muted)]">{t("stores.modal.storeCode")}</label>
        <input value={storeCode} onChange={(e) => setStoreCode(e.target.value.toUpperCase())} placeholder="e.g. DGR" className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" />
        <label className="text-xs font-medium text-[var(--text-muted)]">{t("stores.modal.businessType")}</label>
        <select value={storeType} onChange={(e) => setStoreType(e.target.value as "GROCERY" | "RESTAURANT")} className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm">
          <option value="GROCERY">{t("stores.modal.grocery")}</option>
          <option value="RESTAURANT">{t("stores.modal.restaurant")}</option>
        </select>
        <div className="flex gap-2">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_SECONDARY}`}>{t("stores.modal.cancel")}</button>
          <button disabled={saving || !storeName || !storeCode} onClick={submit} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>
            {saving ? t("stores.modal.creating") : t("stores.createStore")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProvisionedUsersModal({ users, onClose }: { users: ProvisionedUserOut[]; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1">{t("stores.provisioned.title")}</h2>
        <p className="text-sm text-[var(--danger)] mb-4 font-medium">
          {t("stores.provisioned.warning")}
        </p>
        <div className="space-y-2 mb-4">
          {users.map((u) => (
            <div key={u.username} className="p-3 rounded-lg bg-[var(--surface-2)] font-mono text-sm">
              <div className="text-[var(--text)]">{u.username} <span className="text-[var(--text-muted)]">({u.role_code})</span></div>
              <div className="text-[var(--accent)] font-semibold">{u.temp_password}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>{t("stores.provisioned.done")}</button>
      </div>
    </div>
  );
}
