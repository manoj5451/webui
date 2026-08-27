import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as adminApi from "../api/adminApi";
import type { StoreOut, ProvisionedUserOut } from "../api/adminApi";
import AppShell from "../components/AppShell";

export default function StoreManagementScreen() {
  const [stores, setStores] = useState<StoreOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [justProvisioned, setJustProvisioned] = useState<ProvisionedUserOut[] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setStores(await adminApi.listStores());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (store: StoreOut) => {
    try {
      if (store.is_active) await adminApi.deactivateStore(store.store_id);
      else await adminApi.activateStore(store.store_id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed.");
    }
  };

  return (
    <AppShell>
    <div className="bg-[#F0FAF4]">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#0F3D2E]">Store management</h1>
            <p className="text-sm text-[#4B6B57]">{stores.length} stores.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-lg bg-[#16A34A] text-white text-sm font-semibold">
            Create store
          </button>
        </div>

        {loading && <p className="text-sm text-[#4B6B57]">Loading…</p>}
        {error && <p className="text-sm text-[#C1443A]">{error}</p>}

        {!loading && !error && (
          <div className="bg-[#F7FDF9] rounded-xl border border-[#D3EEDD] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#4B6B57] border-b border-[#D3EEDD]">
                  <th className="px-5 py-3 font-medium">Store</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.store_id} className="border-b border-[#D3EEDD] last:border-0">
                    <td className="px-5 py-3.5 font-medium text-[#0F3D2E]">{s.store_name}</td>
                    <td className="px-5 py-3.5 font-mono text-[#4B6B57]">{s.store_code ?? "—"}</td>
                    <td className="px-5 py-3.5 text-[#4B6B57]">{s.store_type_name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-[#E1F3E5] text-[#3F8F4E]" : "bg-[#F7E4E2] text-[#C1443A]"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => toggleActive(s)} className="text-xs font-medium text-[#16A34A] hover:underline">
                        {s.is_active ? "Deactivate" : "Activate"}
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
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [storeType, setStoreType] = useState<"GROCERY" | "RESTAURANT">("GROCERY");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await adminApi.createStore({
        store_name: storeName,
        store_code: storeCode,
        store_type_code: storeType,
      });
      onCreated(res.provisioned_users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create store.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#F7FDF9] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#0F3D2E] mb-4">Create store</h2>
        <label className="text-xs font-medium text-[#4B6B57]">Store name</label>
        <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm" />
        <label className="text-xs font-medium text-[#4B6B57]">Store code</label>
        <input value={storeCode} onChange={(e) => setStoreCode(e.target.value.toUpperCase())} placeholder="e.g. DGR" className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm font-mono" />
        <label className="text-xs font-medium text-[#4B6B57]">Business type</label>
        <select value={storeType} onChange={(e) => setStoreType(e.target.value as "GROCERY" | "RESTAURANT")} className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm">
          <option value="GROCERY">Grocery</option>
          <option value="RESTAURANT">Restaurant</option>
        </select>
        {error && <p className="text-xs text-[#C1443A] mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#D3EEDD]">Cancel</button>
          <button disabled={saving || !storeName || !storeCode} onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold disabled:opacity-40">
            {saving ? "Creating…" : "Create store"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProvisionedUsersModal({ users, onClose }: { users: ProvisionedUserOut[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#F7FDF9] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#0F3D2E] mb-1">Store created</h2>
        <p className="text-sm text-[#C1443A] mb-4 font-medium">
          These temporary passwords are shown once and cannot be retrieved again. Copy them now.
        </p>
        <div className="space-y-2 mb-4">
          {users.map((u) => (
            <div key={u.username} className="p-3 rounded-lg bg-[#F0FAF4] font-mono text-sm">
              <div className="text-[#0F3D2E]">{u.username} <span className="text-[#4B6B57]">({u.role_code})</span></div>
              <div className="text-[#16A34A] font-semibold">{u.temp_password}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold">Done</button>
      </div>
    </div>
  );
}
