import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../hooks/useCatalog";
import * as catalogApi from "../api/catalogApi";
import type { Item } from "../api/catalogApi";

export default function ProductInventoryScreen() {
  const { user, logout } = useAuth();
  const storeId = user?.store_id ?? null;
  const { catalog, isLoading, error, reload } = useCatalog(storeId);
  const [editing, setEditing] = useState<Item | null | undefined>(undefined);

  if (!storeId) return <div className="p-8 text-sm text-[#C1443A]">No store assigned to this account.</div>;
  if (isLoading || !catalog) return <div className="p-8 text-sm text-[#4A5A66]">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-[#C1443A]">{error}</div>;

  const { items, categories } = catalog;
  const categoryName = (id: number) => categories.find((c) => c.category_id === id)?.name ?? "—";

  return (
    <div className="min-h-screen bg-[#F2F6F6]">
      <header className="h-14 bg-[#EFF5F4] border-b border-[#DCE6E4] flex items-center justify-between px-6">
        <span className="font-semibold text-[#0F1F2E]">SmartPOS — Products & Inventory</span>
        <button onClick={logout} className="text-xs text-[#4A5A66] hover:underline">Sign out</button>
      </header>

      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#0F1F2E]">Products & inventory</h1>
            <p className="text-sm text-[#4A5A66]">{items.length} items.</p>
          </div>
          <button onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-lg bg-[#12876F] text-white text-sm font-semibold">
            Add product
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE6E4] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#4A5A66] border-b border-[#DCE6E4]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_id} className="border-b border-[#DCE6E4] last:border-0">
                  <td className="px-5 py-3.5 font-medium text-[#0F1F2E]">{it.name}</td>
                  <td className="px-5 py-3.5 text-[#4A5A66]">{categoryName(it.category_id)}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-[#0F1F2E]">${it.price.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-[#4A5A66]">
                    {it.inventory ? `${it.inventory.quantity_on_hand} ${it.inventory.unit_of_measure}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setEditing(it)} className="text-xs font-medium text-[#12876F] hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== undefined && (
        <AddEditItemModal
          item={editing}
          storeId={storeId}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </div>
  );
}

function AddEditItemModal({
  item, storeId, categories, onClose, onSaved,
}: {
  item: Item | null;
  storeId: number;
  categories: { category_id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.category_id ?? 0);
  const [initialQuantity, setInitialQuantity] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit && item) {
        await catalogApi.updateItem(item.item_id, {
          name, price: parseFloat(price), category_id: categoryId,
        });
        if (adjustDelta) {
          await catalogApi.adjustInventory(item.item_id, parseFloat(adjustDelta), "MANUAL_ADJUST");
        }
      } else {
        await catalogApi.createItem(storeId, {
          category_id: categoryId,
          item_type_code: "PRODUCT",
          name,
          price: parseFloat(price),
          initial_quantity: initialQuantity ? parseFloat(initialQuantity) : undefined,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl p-6 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold text-[#0F1F2E] mb-4">{isEdit ? "Edit" : "Add"} product</h2>

        <label className="text-xs font-medium text-[#4A5A66]">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm" />

        <label className="text-xs font-medium text-[#4A5A66]">Price</label>
        <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm font-mono" placeholder="0.00" />

        <label className="text-xs font-medium text-[#4A5A66]">Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm">
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>

        {!isEdit && (
          <>
            <label className="text-xs font-medium text-[#4A5A66]">Initial stock (leave blank if this store type doesn't track inventory)</label>
            <input value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm font-mono" placeholder="0" />
          </>
        )}
        {isEdit && item?.inventory && (
          <>
            <label className="text-xs font-medium text-[#4A5A66]">Adjust stock (+ to restock, − to correct down)</label>
            <input value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm font-mono" placeholder="e.g. 10 or -2" />
          </>
        )}

        <p className="text-[11px] text-[#4A5A66] mb-3">
          Tax rate isn't editable here yet — there's no backend endpoint to list available tax rates for this store.
        </p>

        {error && <p className="text-xs text-[#C1443A] mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#DCE6E4]">Cancel</button>
          <button disabled={saving || !name || !price} onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
