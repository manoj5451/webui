import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../hooks/useCatalog";
import * as catalogApi from "../api/catalogApi";
import type { Item, TaxRateOut } from "../api/catalogApi";
import AppShell from "../components/AppShell";

export default function ProductInventoryScreen() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const { catalog, isLoading, error, reload } = useCatalog(storeId);
  const [editing, setEditing] = useState<Item | null | undefined>(undefined);
  const [showAddCategory, setShowAddCategory] = useState(false);

  if (!storeId) return <AppShell><div className="p-8 text-sm text-[#C1443A]">No store assigned to this account.</div></AppShell>;
  if (isLoading || !catalog) return <AppShell><div className="p-8 text-sm text-[#4B6B57]">Loading…</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-sm text-[#C1443A]">{error}</div></AppShell>;

  const { items, categories, store } = catalog;
  const categoryName = (id: number) => categories.find((c) => c.category_id === id)?.name ?? "—";

  return (
    <AppShell storeName={store.store_name}>
    <div className="bg-[#F0FAF4]">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#0F3D2E]">Products & inventory</h1>
            <p className="text-sm text-[#4B6B57]">{items.length} items.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddCategory(true)} className="px-4 py-2.5 rounded-lg border border-[#D3EEDD] text-sm font-semibold text-[#0F3D2E]">
              Add category
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={categories.length === 0}
              title={categories.length === 0 ? "Add a category first" : undefined}
              className="px-4 py-2.5 rounded-lg bg-[#16A34A] text-white text-sm font-semibold disabled:opacity-40"
            >
              Add product
            </button>
          </div>
        </div>

        {categories.length === 0 && (
          <div className="mb-6 rounded-lg border border-[#D97706]/40 bg-[#FDEFDA] px-4 py-3 text-sm text-[#9A6B14]">
            This store has no categories yet — a new store starts empty. Add at least one category before adding products, or they won't have anywhere to belong (and won't show up in Billing).
          </div>
        )}

        <div className="bg-[#F7FDF9] rounded-xl border border-[#D3EEDD] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#4B6B57] border-b border-[#D3EEDD]">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_id} className="border-b border-[#D3EEDD] last:border-0">
                  <td className="px-5 py-3.5 font-medium text-[#0F3D2E]">{it.name}</td>
                  <td className="px-5 py-3.5 text-[#4B6B57]">{categoryName(it.category_id)}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-[#0F3D2E]">${it.price.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-[#4B6B57]">
                    {it.inventory ? `${it.inventory.quantity_on_hand} ${it.inventory.unit_of_measure}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setEditing(it)} className="text-xs font-medium text-[#16A34A] hover:underline">Edit</button>
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

      {showAddCategory && (
        <AddCategoryModal
          storeId={storeId}
          hasCuisines={store.has_cuisines}
          onClose={() => setShowAddCategory(false)}
          onSaved={() => {
            setShowAddCategory(false);
            reload();
          }}
        />
      )}
    </div>
    </AppShell>
  );
}

function AddCategoryModal({
  storeId, hasCuisines, onClose, onSaved,
}: {
  storeId: number;
  hasCuisines: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await catalogApi.createCategory(storeId, {
        name,
        // Restaurant stores use a CUISINE -> MENU_CATEGORY hierarchy;
        // this quick fix only covers the flat product-category case
        // (Grocery-type stores). A brand-new Restaurant store needing
        // its first cuisine + menu category isn't handled by this
        // modal — that needs a proper Category Management screen,
        // which hasn't been scoped as its own module yet.
        category_type: hasCuisines ? "CUISINE" : "PRODUCT_CATEGORY",
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#F7FDF9] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#0F3D2E] mb-4">Add category</h2>
        {hasCuisines && (
          <p className="text-xs text-[#4B6B57] mb-3">
            This is a restaurant store — this creates a top-level cuisine. Menu categories within a cuisine aren't supported by this quick form yet.
          </p>
        )}
        <label className="text-xs font-medium text-[#4B6B57]">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={hasCuisines ? "e.g. Indian" : "e.g. Beverages"}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm"
        />
        {error && <p className="text-xs text-[#C1443A] mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#D3EEDD]">Cancel</button>
          <button disabled={saving || !name} onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold disabled:opacity-40">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
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
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.category_id ?? 0);
  const [initialQuantity, setInitialQuantity] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Module 3: pricing can be entered directly, or computed from
  // procurement cost + profit margin + tax rate. Default to whichever
  // mode this item already used — an item created before Module 3, or
  // one that's always used a plain price, defaults to "direct" so
  // editing it doesn't force a workflow change it never asked for.
  const [pricingMode, setPricingMode] = useState<"direct" | "computed">(
    item?.procurement_price != null && item?.profit_percent != null ? "computed" : "direct"
  );
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [procurementPrice, setProcurementPrice] = useState(
    item?.procurement_price != null ? String(item.procurement_price) : ""
  );
  const [profitPercent, setProfitPercent] = useState(
    item?.profit_percent != null ? String(item.profit_percent) : "20"
  );

  // Simplified per direct request: a fixed 5/10/20% dropdown instead of
  // picking from arbitrary named TaxRate rows. Pre-select from the
  // item's already-resolved tax_rate_percent (not tax_rate_id) when
  // editing — that display value is exactly what this dropdown shows.
  const [vatPercent, setVatPercent] = useState(
    item?.tax_rate_percent != null ? String(item.tax_rate_percent) : "0"
  );

  // Still fetched, but only used internally now to avoid creating a
  // duplicate TaxRate row every time the same percentage gets picked —
  // the dropdown itself never shows this list directly anymore.
  const [taxRates, setTaxRates] = useState<TaxRateOut[]>([]);

  useEffect(() => {
    catalogApi.getTaxRates(storeId).then(setTaxRates).catch(() => setTaxRates([]));
  }, [storeId]);

  // Live preview — same formula as the backend (service._compute_selling_price),
  // duplicated here only for display; the backend always recomputes and
  // is the actual source of truth on submit, so this drifting slightly
  // out of sync would show a wrong preview but never save a wrong price.
  // Reads directly from the selected vatPercent now, not from a
  // tax_rate_id lookup — removes the exact indirection that was the
  // likely source of tax not applying correctly before.
  const computedPreview =
    procurementPrice && profitPercent
      ? parseFloat(procurementPrice) * (1 + parseFloat(profitPercent) / 100) * (1 + parseFloat(vatPercent) / 100)
      : null;

  // Resolves a plain percentage (5/10/20) to a real TaxRate row's ID,
  // reusing an existing one with that exact rate if this store already
  // has it, creating one only if it doesn't. Runs at submit time, not
  // on every dropdown change — no need to create a TaxRate row for a
  // selection the user might still change before saving.
  const resolveTaxRateId = async (percent: number): Promise<number | undefined> => {
    if (percent === 0) return undefined;
    const existing = taxRates.find((r) => r.rate_percent === percent);
    if (existing) return existing.tax_rate_id;
    const created = await catalogApi.createTaxRate(storeId, { name: `VAT ${percent}%`, rate_percent: percent });
    setTaxRates((rates) => [...rates, created]);
    return created.tax_rate_id;
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      let pricingFields: Record<string, number | undefined>;
      if (pricingMode === "computed") {
        const resolvedTaxRateId = await resolveTaxRateId(parseFloat(vatPercent));
        pricingFields = {
          procurement_price: parseFloat(procurementPrice),
          profit_percent: parseFloat(profitPercent),
          tax_rate_id: resolvedTaxRateId,
        };
      } else {
        pricingFields = { price: parseFloat(price) };
      }

      if (isEdit && item) {
        await catalogApi.updateItem(item.item_id, {
          name, category_id: categoryId, ...pricingFields,
        });
        if (adjustDelta) {
          await catalogApi.adjustInventory(item.item_id, parseFloat(adjustDelta), "MANUAL_ADJUST");
        }
      } else {
        await catalogApi.createItem(storeId, {
          category_id: categoryId,
          item_type_code: "PRODUCT",
          name,
          ...pricingFields,
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

  const canSubmit =
    !!name &&
    (pricingMode === "direct" ? !!price : !!procurementPrice && !!profitPercent);

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#F7FDF9] rounded-xl p-6 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold text-[#0F3D2E] mb-4">{isEdit ? "Edit" : "Add"} product</h2>

        <label className="text-xs font-medium text-[#4B6B57]">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm" />

        <label className="text-xs font-medium text-[#4B6B57]">Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm">
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>

        {/* Module 3: pricing mode toggle */}
        <div className="flex rounded-lg border border-[#D3EEDD] p-1 mb-3">
          <button
            type="button"
            onClick={() => setPricingMode("direct")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md ${pricingMode === "direct" ? "bg-[#16A34A] text-white" : "text-[#4B6B57]"}`}
          >
            Enter price directly
          </button>
          <button
            type="button"
            onClick={() => setPricingMode("computed")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md ${pricingMode === "computed" ? "bg-[#16A34A] text-white" : "text-[#4B6B57]"}`}
          >
            Calculate from cost
          </button>
        </div>

        {pricingMode === "direct" ? (
          <>
            <label className="text-xs font-medium text-[#4B6B57]">Price</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm font-mono" placeholder="0.00" />
          </>
        ) : (
          <>
            <label className="text-xs font-medium text-[#4B6B57]">Procurement price</label>
            <input value={procurementPrice} onChange={(e) => setProcurementPrice(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm font-mono" placeholder="0.00" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-[#4B6B57]">Profit percent</label>
                <select value={profitPercent} onChange={(e) => setProfitPercent(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm">
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                  <option value="30">30%</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B6B57]">Tax rate</label>
                <select
                  value={vatPercent}
                  onChange={(e) => setVatPercent(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm"
                >
                  <option value="0">None</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                </select>
              </div>
            </div>

            {computedPreview !== null && (
              <div className="rounded-lg border border-[#16A34A]/30 bg-[#DEF7E3]/30 px-3 py-2.5 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#4B6B57]">Selling price</span>
                  <span className="font-mono tabular-nums font-semibold text-[#0F3D2E]">${computedPreview.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-[#4B6B57] mt-1">
                  Procurement × (1 + profit%) × (1 + tax%) — recalculated by the server on save.
                </p>
              </div>
            )}
          </>
        )}

        {!isEdit && (
          <>
            <label className="text-xs font-medium text-[#4B6B57]">Initial stock (leave blank if this store type doesn't track inventory)</label>
            <input value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm font-mono" placeholder="0" />
          </>
        )}
        {isEdit && item?.inventory && (
          <>
            <label className="text-xs font-medium text-[#4B6B57]">Adjust stock (+ to restock, − to correct down)</label>
            <input value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[#D3EEDD] text-sm font-mono" placeholder="e.g. 10 or -2" />
          </>
        )}

        {error && <p className="text-xs text-[#C1443A] mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#D3EEDD]">Cancel</button>
          <button disabled={saving || !canSubmit} onClick={submit} className="flex-1 py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold disabled:opacity-40">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
