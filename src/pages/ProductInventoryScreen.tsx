import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useErrorDialog } from "../context/ErrorDialogContext";
import { useCatalog } from "../hooks/useCatalog";
import * as catalogApi from "../api/catalogApi";
import type { Item, TaxRateOut, CategoryOut } from "../api/catalogApi";
import AppShell from "../components/AppShell";
import { GLOSSY_BUTTON_PRIMARY, GLOSSY_BUTTON_SECONDARY, GLOSSY_CARD } from "../styles/uiEffects";
import { SkeletonListRow } from "../components/Skeleton";
import { formatMoney } from "../utils/formatMoney";

export default function ProductInventoryScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const storeId = user?.store_id ?? null;
  const { catalog, isLoading, error, reload } = useCatalog(storeId);
  const [editing, setEditing] = useState<Item | null | undefined>(undefined);
  const [showAddCategory, setShowAddCategory] = useState(false);

  if (!storeId) return <AppShell><div className="p-8 text-sm text-[var(--danger)]">{t("products.noStoreAssigned")}</div></AppShell>;
  if (isLoading || !catalog) {
    return (
      <AppShell>
        <div className={`m-8 rounded-xl p-5 ${GLOSSY_CARD}`}>
          <SkeletonListRow />
          <SkeletonListRow />
          <SkeletonListRow />
        </div>
      </AppShell>
    );
  }
  if (error) return <AppShell><div className="p-8 text-sm text-[var(--danger)]">{error}</div></AppShell>;

  const { items, categories, store } = catalog;
  const categoryName = (id: number) => categories.find((c) => c.category_id === id)?.name ?? "—";

  return (
    <AppShell storeName={store.store_name}>
    <div className="bg-[var(--bg)]">
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">{t("products.title")}</h1>
            <p className="text-sm text-[var(--text-muted)]">{items.length} {t("products.count")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddCategory(true)} className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${GLOSSY_BUTTON_SECONDARY}`}>
              {store.has_cuisines ? t("products.addCuisine") : t("products.addCategory")}
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={categories.length === 0}
              title={categories.length === 0 ? t("products.addCategoryFirst") : undefined}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
            >
              {store.has_cuisines ? t("products.addItem") : t("products.addProduct")}
            </button>
          </div>
        </div>

        {categories.length === 0 && (
          <div className="mb-6 rounded-lg border border-[var(--accent-dark)]/40 bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-text)]">
            {t("products.noCategoriesYet")}
          </div>
        )}

        <div className={`rounded-xl overflow-hidden ${GLOSSY_CARD}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="px-5 py-3 font-medium">{t("products.col.name")}</th>
                <th className="px-5 py-3 font-medium">{t("products.col.category")}</th>
                <th className="px-5 py-3 font-medium">{t("products.col.price")}</th>
                <th className="px-5 py-3 font-medium">{t("products.col.stock")}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3.5 font-medium text-[var(--text)]">{it.name}</td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">{categoryName(it.category_id)}</td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-[var(--text)]">{formatMoney(it.price)}</td>
                  <td className="px-5 py-3.5 text-[var(--text-muted)]">
                    {it.inventory ? `${it.inventory.quantity_on_hand} ${it.inventory.unit_of_measure}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setEditing(it)} className="text-xs font-medium text-[var(--accent)] hover:underline">{t("products.edit")}</button>
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
          hasCuisines={store.has_cuisines}
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
  const { t } = useLanguage();
  const { showError } = useErrorDialog();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
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
      showError(e instanceof Error ? e.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[var(--surface)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{hasCuisines ? t("products.addCuisine") : t("products.addCategory")}</h2>
        {hasCuisines && (
          <p className="text-xs text-[var(--text-muted)] mb-3">
            {t("products.restaurantCuisineHint")}
          </p>
        )}
        <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.name")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={hasCuisines ? "e.g. Indian" : "e.g. Beverages"}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_SECONDARY}`}>{t("products.cancel")}</button>
          <button disabled={saving || !name} onClick={submit} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddEditItemModal({
  item, storeId, categories, hasCuisines, onClose, onSaved,
}: {
  item: Item | null;
  storeId: number;
  categories: CategoryOut[];
  hasCuisines: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const { t } = useLanguage();
  const { showError } = useErrorDialog();
  const [name, setName] = useState(item?.name ?? "");

  // Module 4: restaurant stores pick Cuisine then Menu Category
  // (two-level), rather than one flat dropdown — combining what used
  // to require a separate "Add category" trip first into the same
  // flow as adding the item itself, per the explicit design ask.
  // Grocery stores are completely unaffected — same flat picker as
  // Module 3, unchanged below.
  const existingCategory = item ? categories.find((c) => c.category_id === item.category_id) : undefined;
  const [selectedCuisineId, setSelectedCuisineId] = useState<number | "">(
    existingCategory?.parent_category_id ?? ""
  );
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.category_id ?? 0);
  const [showNewCuisine, setShowNewCuisine] = useState(false);
  const [newCuisineName, setNewCuisineName] = useState("");
  const [showNewMenuCategory, setShowNewMenuCategory] = useState(false);
  const [newMenuCategoryName, setNewMenuCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories);

  const cuisines = localCategories.filter((c) => c.category_type === "CUISINE");
  const menuCategoriesForCuisine = localCategories.filter(
    (c) => c.category_type === "MENU_CATEGORY" && c.parent_category_id === selectedCuisineId
  );

  const createCuisine = async () => {
    if (!newCuisineName) return;
    setCreatingCategory(true);
    try {
      const created = await catalogApi.createCategory(storeId, { name: newCuisineName, category_type: "CUISINE" });
      setLocalCategories((cats) => [...cats, created]);
      setSelectedCuisineId(created.category_id);
      setCategoryId(0); // force picking/creating a menu category under the new cuisine
      setShowNewCuisine(false);
      setNewCuisineName("");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Could not create cuisine.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const createMenuCategory = async () => {
    if (!newMenuCategoryName || selectedCuisineId === "") return;
    setCreatingCategory(true);
    try {
      const created = await catalogApi.createCategory(storeId, {
        name: newMenuCategoryName, category_type: "MENU_CATEGORY", parent_category_id: selectedCuisineId,
      });
      setLocalCategories((cats) => [...cats, created]);
      setCategoryId(created.category_id);
      setShowNewMenuCategory(false);
      setNewMenuCategoryName("");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Could not create menu category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const [initialQuantity, setInitialQuantity] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
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

  // Simplified per direct request: a fixed dropdown instead of picking
  // from arbitrary named TaxRate rows. Restaurants require a real VAT
  // value (no "None") since point 4 makes Price + VAT the only two
  // fields for a menu item; grocery keeps "None" as a valid choice
  // since its pricing flow stays optional/flexible.
  const [vatPercent, setVatPercent] = useState(
    item?.tax_rate_percent != null ? String(item.tax_rate_percent) : (hasCuisines ? "5.5" : "0")
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
    try {
      let pricingFields: Record<string, number | undefined>;
      if (hasCuisines) {
        // Restaurant: Price + VAT only, per the explicit simplification
        // request — no cost/margin computation, no pricing-mode choice.
        // VAT is still resolved to a real TaxRate row underneath (same
        // find-or-create as grocery's computed mode) so Sales' receipt
        // math stays connected to the same data either way.
        const resolvedTaxRateId = await resolveTaxRateId(parseFloat(vatPercent));
        pricingFields = { price: parseFloat(price), tax_rate_id: resolvedTaxRateId };
      } else if (pricingMode === "computed") {
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
          item_type_code: hasCuisines ? "MENU_ITEM" : "PRODUCT",
          name,
          ...pricingFields,
          initial_quantity: initialQuantity ? parseFloat(initialQuantity) : undefined,
        });
      }
      onSaved();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !!name &&
    categoryId !== 0 &&
    (hasCuisines
      ? !!price && !!vatPercent
      : pricingMode === "direct" ? !!price : !!procurementPrice && !!profitPercent);

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-xl p-6 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">{isEdit ? "Edit" : "Add"} product</h2>

        <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.name")}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm" />

        {hasCuisines ? (
          <>
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.cuisine")}</label>
            <select
              value={selectedCuisineId}
              onChange={(e) => {
                if (e.target.value === "__new__") { setShowNewCuisine(true); return; }
                setSelectedCuisineId(e.target.value === "" ? "" : Number(e.target.value));
                setCategoryId(0); // force a fresh menu-category pick under the new cuisine
              }}
              className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm"
            >
              <option value="">{t("products.selectCuisine")}</option>
              {cuisines.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              <option value="__new__">+ Add new cuisine…</option>
            </select>

            {showNewCuisine && (
              <div className="rounded-lg border border-[var(--border)] p-3 mb-3 space-y-2">
                <input
                  value={newCuisineName}
                  onChange={(e) => setNewCuisineName(e.target.value)}
                  placeholder={t("products.addNewCuisinePlaceholder")}
                  className="w-full px-2.5 py-2 rounded-md border border-[var(--border)] text-xs"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewCuisine(false)} className={`flex-1 py-1.5 text-xs rounded-md font-medium ${GLOSSY_BUTTON_SECONDARY}`}>{t("products.cancel")}</button>
                  <button type="button" disabled={creatingCategory} onClick={createCuisine} className={`flex-1 py-1.5 text-xs rounded-md font-medium ${GLOSSY_BUTTON_PRIMARY}`}>
                    {creatingCategory ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            )}

            {selectedCuisineId !== "" && (
              <>
                <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.menuCategory")}</label>
                <select
                  value={categoryId}
                  onChange={(e) => e.target.value === "__new__" ? setShowNewMenuCategory(true) : setCategoryId(Number(e.target.value))}
                  className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm"
                >
                  <option value={0}>{t("products.selectMenuCategory")}</option>
                  {menuCategoriesForCuisine.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                  <option value="__new__">+ Add new menu category…</option>
                </select>

                {showNewMenuCategory && (
                  <div className="rounded-lg border border-[var(--border)] p-3 mb-3 space-y-2">
                    <input
                      value={newMenuCategoryName}
                      onChange={(e) => setNewMenuCategoryName(e.target.value)}
                      placeholder={t("products.addNewMenuCategoryPlaceholder")}
                      className="w-full px-2.5 py-2 rounded-md border border-[var(--border)] text-xs"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewMenuCategory(false)} className={`flex-1 py-1.5 text-xs rounded-md font-medium ${GLOSSY_BUTTON_SECONDARY}`}>{t("products.cancel")}</button>
                      <button type="button" disabled={creatingCategory} onClick={createMenuCategory} className={`flex-1 py-1.5 text-xs rounded-md font-medium ${GLOSSY_BUTTON_PRIMARY}`}>
                        {creatingCategory ? "Creating…" : "Create"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.category")}</label>
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm">
              {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </>
        )}

        {hasCuisines ? (
          <>
            {/* Restaurant: Price + VAT only, per explicit simplification
                request — no pricing-mode toggle, no cost/margin fields,
                no initial stock (menu items don't track inventory). */}
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.price")}</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" placeholder="0.00" />

            <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.vatPercentage")}</label>
            <select value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm">
              <option value="5.5">5.5%</option>
              <option value="10">10%</option>
              <option value="20">20%</option>
            </select>
          </>
        ) : (
          <>
            {/* Module 3: pricing mode toggle */}
            <div className="flex rounded-lg border border-[var(--border)] p-1 mb-3">
              <button
                type="button"
                onClick={() => setPricingMode("direct")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md ${pricingMode === "direct" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
              >
                Enter price directly
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("computed")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md ${pricingMode === "computed" ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
              >
                Calculate from cost
              </button>
            </div>

            {pricingMode === "direct" ? (
              <>
                <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.price")}</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" placeholder="0.00" />
              </>
            ) : (
              <>
                <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.procurementPrice")}</label>
                <input value={procurementPrice} onChange={(e) => setProcurementPrice(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" placeholder="0.00" />

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.profitPercent")}</label>
                    <select value={profitPercent} onChange={(e) => setProfitPercent(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm">
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                      <option value="30">30%</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.taxRate")}</label>
                    <select
                      value={vatPercent}
                      onChange={(e) => setVatPercent(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm"
                    >
                      <option value="0">{t("products.none")}</option>
                      <option value="5.5">5.5%</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                    </select>
                  </div>
                </div>

                {computedPreview !== null && (
                  <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2.5 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--text-muted)]">{t("products.sellingPrice")}</span>
                      <span className="font-mono tabular-nums font-semibold text-[var(--text)]">{formatMoney(computedPreview)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      {t("products.priceFormula")}
                    </p>
                  </div>
                )}
              </>
            )}

            {!isEdit && (
              <>
                <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.initialStock")}</label>
                <input value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" placeholder="0" />
              </>
            )}
          </>
        )}

        {isEdit && item?.inventory && (
          <>
            <label className="text-xs font-medium text-[var(--text-muted)]">{t("products.adjustStock")}</label>
            <input value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} className="w-full mt-1 mb-3 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" placeholder={t("products.adjustStockPlaceholder")} />
          </>
        )}


        <div className="flex gap-2">
          <button onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_SECONDARY}`}>{t("products.cancel")}</button>
          <button disabled={saving || !canSubmit} onClick={submit} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
