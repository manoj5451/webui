/**
 * src/pages/BillingScreen.tsx
 *
 * Data-driven category/cuisine rendering (no storeType branching) —
 * same architecture decision as the earlier merge attempt, carried
 * into this fresh project and re-verified against the now-confirmed
 * real CatalogTree shape.
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useErrorDialog } from "../context/ErrorDialogContext";
import { useLanguage } from "../context/LanguageContext";
import { useCatalog } from "../hooks/useCatalog";
import { formatMoney } from "../utils/formatMoney";
import type { Item, Category } from "../api/catalogApi";
import * as catalogApi from "../api/catalogApi";
import type { TableOut } from "../api/catalogApi";
import { createSale, holdSale, resumeSale, listHeldSales } from "../api/salesApi";
import type { PaymentMethod, SaleOut } from "../api/salesApi";
import NumberPad from "../components/NumberPad";
import type { DisplayMessage } from "./CustomerDisplayScreen";
import AppShell from "../components/AppShell";
import { GLOSSY_BUTTON_PRIMARY, GLOSSY_BUTTON_SECONDARY, GLOSSY_CARD } from "../styles/uiEffects";
import { SkeletonListRow } from "../components/Skeleton";

interface CartLine {
  item: Item;
  qty: number;
}

function Money({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{formatMoney(value)}</span>;
}

const PAYMENT_MODES: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "billing.payment.card" },
  { id: "debit", label: "billing.payment.debit" },
  { id: "cash", label: "billing.payment.cash" },
  { id: "wallet", label: "billing.payment.wallet" },
  { id: "gift", label: "billing.payment.gift" },
  { id: "split", label: "billing.payment.split" },
];

export default function BillingScreen() {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const { showError } = useErrorDialog();
  const { t } = useLanguage();
  const storeId = user?.store_id ?? null;
  const { catalog, isLoading, error } = useCatalog(storeId);

  const [selectedCuisineId, setSelectedCuisineId] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [screen, setScreen] = useState<"cart" | "payment" | "receipt">("cart");
  const [qtyEditItemId, setQtyEditItemId] = useState<number | null>(null);
  const [qtyDraft, setQtyDraft] = useState("");

  const [payMode, setPayMode] = useState<PaymentMethod | null>(null);
  const [cashTendered, setCashTendered] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [splitCardAmt, setSplitCardAmt] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleOut | null>(null);

  // --- Module 4: Hold & Resume, Table selection ---
  const [selectedTableId, setSelectedTableId] = useState<number | "">("");
  const [tables, setTables] = useState<TableOut[]>([]);
  const [heldSales, setHeldSales] = useState<SaleOut[]>([]);
  const [showHeldList, setShowHeldList] = useState(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    catalogApi.getTables(storeId).then(setTables).catch(() => setTables([]));
  }, [storeId]);

  const loadHeldSales = () => {
    if (!storeId) return;
    listHeldSales(storeId).then(setHeldSales).catch(() => setHeldSales([]));
  };
  useEffect(loadHeldSales, [storeId]);

  // --- Module 1.5: Customer-Facing Display ---
  // Both effects live here, before the early returns below, because
  // hooks must run unconditionally on every render — the loading/error
  // early-return paths would otherwise call fewer hooks than the
  // success path and React would throw. `catalog` (possibly still
  // null while loading) and `cart`/`screen`/`completedSale` are all
  // already available at this point, so the guard is inside the
  // effect body instead of in the render flow.
  //
  // Fix, found after real use: BroadcastChannel does not replay past
  // messages to a listener that joins late. If the cashier opens the
  // customer display *after* items are already in the cart — or
  // refreshes/reopens it mid-sale — it correctly starts idle and then
  // has nothing to show until the next cart change, since no new
  // broadcast happens on its own. Fixed with a small request/response
  // handshake: CustomerDisplayScreen posts {type: "request-sync"} the
  // moment it mounts, and this component answers with the current
  // state instead of waiting for the next natural change.
  const buildDisplayMessage = (): DisplayMessage => {
    if (!catalog) return { type: "idle" };
    if (screen === "receipt" && completedSale) {
      return {
        type: "receipt",
        receiptNumber: completedSale.receipt_number,
        total: completedSale.total,
        paymentMethod: completedSale.payment_method,
        tenderedAmount: completedSale.tendered_amount,
        changeAmount: completedSale.change_amount,
      };
    }
    if (screen === "payment") {
      const total = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
      return { type: "payment", amountDue: total };
    }
    if (screen === "cart" && cart.length > 0) {
      const total = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
      return {
        type: "cart",
        storeName: catalog.store.store_name,
        lines: cart.map((l) => ({
          name: l.item.name,
          price: l.item.price,
          qty: l.qty,
          lineTotal: l.item.price * l.qty,
        })),
        estimatedTotal: total,
      };
    }
    return { type: "idle" };
  };

  // Kept in sync on every render so the channel's onmessage handler
  // below — registered once, in the effect with an empty dependency
  // array — always calls the *current* builder rather than closing
  // over stale cart/screen/completedSale values from whenever the
  // effect first ran.
  const buildDisplayMessageRef = useRef(buildDisplayMessage);
  buildDisplayMessageRef.current = buildDisplayMessage;

  const displayChannelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const channel = new BroadcastChannel("smartpos-customer-display");
    displayChannelRef.current = channel;
    channel.onmessage = (event: MessageEvent<DisplayMessage | { type: "request-sync" }>) => {
      if (event.data?.type === "request-sync") {
        channel.postMessage(buildDisplayMessageRef.current());
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    const channel = displayChannelRef.current;
    if (!channel || !catalog) return;
    channel.postMessage(buildDisplayMessage());
  }, [screen, cart, completedSale, catalog]);
  // --- end Module 1.5 wiring ---

  if (!storeId) {
    return <AppShell><div className="p-8 text-sm text-[var(--danger)]">{t("products.noStoreAssigned")}</div></AppShell>;
  }
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
  if (error) {
    return <AppShell><div className="p-8 text-sm text-[var(--danger)]">Couldn't load the catalog: {error}</div></AppShell>;
  }

  const { store, categories, items } = catalog;

  const cuisines: Category[] = store.has_cuisines
    ? categories.filter((c) => c.category_type === "CUISINE" && c.parent_category_id === null)
    : [];
  const activeCuisineId = selectedCuisineId ?? cuisines[0]?.category_id ?? null;

  const railCategories: Category[] = store.has_cuisines
    ? categories.filter((c) => c.parent_category_id === activeCuisineId)
    : categories.filter((c) => c.category_type === "PRODUCT_CATEGORY" && c.parent_category_id === null);

  const currentCategoryId = activeCategoryId ?? railCategories[0]?.category_id ?? null;

  const visibleItems = items.filter((i) => {
    if (i.category_id !== currentCategoryId) return false;
    if (!query) return true;
    return (
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      (i.barcode ?? "").toLowerCase().includes(query.toLowerCase())
    );
  });

  const addToCart = (item: Item) => {
    setCart((c) => {
      const existing = c.find((l) => l.item.item_id === item.item_id);
      if (existing) return c.map((l) => (l.item.item_id === item.item_id ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { item, qty: 1 }];
    });
  };
  const changeQty = (itemId: number, delta: number) => {
    setCart((c) =>
      c.map((l) => (l.item.item_id === itemId ? { ...l, qty: Math.max(0, l.qty + delta) } : l)).filter((l) => l.qty > 0)
    );
  };
  const removeLine = (itemId: number) => setCart((c) => c.filter((l) => l.item.item_id !== itemId));

  const openQtyEditor = (line: CartLine) => {
    setQtyEditItemId(line.item.item_id);
    setQtyDraft(String(line.qty));
  };
  const applyQtyEditor = () => {
    const n = parseFloat(qtyDraft);
    if (n > 0) setCart((c) => c.map((l) => (l.item.item_id === qtyEditItemId ? { ...l, qty: n } : l)));
    setQtyEditItemId(null);
  };

  const estimatedTotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);

  const resetPayment = () => {
    setPayMode(null);
    setCashTendered("");
    setGiftCode("");
    setSplitCardAmt("");
  };
  const goToPayment = () => {
    // Restaurant stores require a table to be selected before charging
    // — a table-linked sale is how the backend knows which table to
    // reopen once payment completes (see Module 4's checkout auto-
    // reopen logic), so an untracked table would silently never get
    // marked open again. Grocery stores have no table concept at all,
    // so this check is skipped entirely for them, not just hidden.
    if (store.has_cuisines && selectedTableId === "") {
      showError(
        "Please select a table before charging this order.",
        "Table required"
      );
      return;
    }
    resetPayment();
    setScreen("payment");
  };

  const submitSale = async (extra: Partial<Parameters<typeof createSale>[0]> = {}) => {
    if (!storeId) return;
    setProcessing(true);
    try {
      const sale = await createSale({
        store_id: storeId,
        table_id: selectedTableId === "" ? undefined : selectedTableId,
        lines: cart.map((l) => ({ item_id: l.item.item_id, quantity: l.qty })),
        payment_method: payMode as PaymentMethod,
        ...extra,
      });
      setCompletedSale(sale);
      setScreen("receipt");
      showToast(`Sale ${sale.receipt_number} completed`);
      // Backend reopens the associated table on checkout — refresh so
      // the selector reflects that immediately, not just after a
      // manual page reload.
      if (sale.table_id != null && storeId) {
        catalogApi.getTables(storeId).then(setTables).catch(() => {});
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed.";
      showError(message);
    } finally {
      setProcessing(false);
    }
  };

  const holdCurrentSale = async () => {
    if (!storeId || cart.length === 0) return;
    setHolding(true);
    try {
      await holdSale({
        store_id: storeId,
        table_id: selectedTableId === "" ? undefined : selectedTableId,
        lines: cart.map((l) => ({ item_id: l.item.item_id, quantity: l.qty })),
      });
      setCart([]);
      setSelectedTableId("");
      showToast("Sale held");
      loadHeldSales();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not hold this sale.";
      showError(message);
    } finally {
      setHolding(false);
    }
  };

  const resumeHeldSale = async (saleId: number) => {
    if (!catalog) return;
    try {
      const resumed = await resumeSale(saleId);
      // resumeSale returns item_id/name/qty/price, not a full Item —
      // look each one up in the already-loaded catalog to rebuild real
      // CartLine objects (CartLine.item needs the full Item, since the
      // rest of this screen's price/tax calculations depend on it).
      const rebuiltCart: CartLine[] = [];
      for (const line of resumed.lines) {
        const fullItem = catalog.items.find((i) => i.item_id === line.item_id);
        if (fullItem) rebuiltCart.push({ item: fullItem, qty: line.quantity });
      }
      setCart(rebuiltCart);
      setSelectedTableId(resumed.table_id ?? "");
      setShowHeldList(false);
      showToast(`Resumed ${resumed.receipt_number}`);
      loadHeldSales();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not resume this sale.";
      showError(message);
    }
  };

  const startNewSale = () => {
    setCart([]);
    setSelectedTableId("");
    resetPayment();
    setCompletedSale(null);
    setScreen("cart");
  };

  return (
    <AppShell
      storeName={store.store_name}
      headerExtra={
        <button
          onClick={() =>
            window.open(
              "/customer-display",
              "customerDisplay",
              "width=900,height=700,menubar=no,toolbar=no,location=no"
            )
          }
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] text-xs font-medium transition-colors"
          title="Opens a second window — drag it onto the customer-facing monitor"
        >
          {t("billing.customerDisplay")}
        </button>
      }
    >
    <div className="flex h-full font-sans">
      <div className="w-44 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col shrink-0 overflow-auto">
        {store.has_cuisines ? (
          <div className="p-2 border-b border-[var(--border)] space-y-1">
            <label className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-muted)] px-1">{t("billing.cuisine")}</label>
            {cuisines.map((c) => (
              <button
                key={c.category_id}
                onClick={() => {
                  setSelectedCuisineId(c.category_id);
                  setActiveCategoryId(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCuisineId === c.category_id ? "bg-[var(--accent)] text-[var(--text-on-accent)]" : "text-[var(--text-muted)] hover:bg-[var(--warning-bg)]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          // Matches the search bar and Current bill headers' fixed
          // 60px height, so all three columns' top borders line up —
          // without this, a Grocery-type store (no cuisine selector)
          // would jump straight into the category list at the top with
          // nothing to align against, while the columns beside it both
          // have a 60px header band.
          <div className="h-[60px] px-3 border-b border-[var(--border)] flex items-center">
            <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-muted)]">{t("billing.categories")}</span>
          </div>
        )}
        <div className="p-2 space-y-1">
          {railCategories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setActiveCategoryId(c.category_id)}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium relative transition-colors ${
                currentCategoryId === c.category_id ? "bg-[var(--accent)] text-[var(--text-on-accent)]" : "text-[var(--text-muted)] hover:bg-[var(--surface)]"
              }`}
            >
              {currentCategoryId === c.category_id && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-[var(--accent)]" />
              )}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-[60px] px-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={store.requires_barcode ? t("billing.searchPlaceholder") : t("billing.searchPlaceholderNoBarcode")}
            className="w-full max-w-md px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          />
        </div>
        <div className="flex-1 overflow-auto p-4 grid grid-cols-3 gap-3 content-start">
          {visibleItems.map((it) => (
            <button
              key={it.item_id}
              onClick={() => addToCart(it)}
              disabled={!it.is_available}
              className={`text-left rounded-xl p-4 disabled:opacity-40 ${GLOSSY_CARD}`}
            >
              <div className="text-sm font-medium text-[var(--text)] mb-1">{it.name}</div>
              <div className="flex items-center justify-between">
                <span className="font-mono tabular-nums font-semibold text-[var(--accent)]"><Money value={it.price} /></span>
                {it.inventory && <span className="text-[11px] text-[var(--text-muted)]">{it.inventory.quantity_on_hand} in stock</span>}
              </div>
            </button>
          ))}
          {visibleItems.length === 0 && (
            <div className="col-span-3 text-center text-sm text-[var(--text-muted)] py-12">{t("billing.noItemsInCategory")}</div>
          )}
        </div>
      </div>

      <div className="w-96 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shrink-0">
        {screen === "cart" && qtyEditItemId !== null && (
          <>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <button onClick={() => setQtyEditItemId(null)}>←</button>
              <h2 className="font-semibold text-[var(--text)]">{t("billing.setQuantity")}</h2>
            </div>
            <div className="p-6 flex-1">
              <div className="text-3xl font-mono tabular-nums font-semibold text-[var(--text)] mb-5 border-b-2 border-[var(--accent)] pb-2 text-center">
                {qtyDraft || "0"}
              </div>
              <NumberPad
                onDigit={(k) => setQtyDraft((d) => (d === "0" ? k : d + k))}
                onBackspace={() => setQtyDraft((d) => d.slice(0, -1) || "0")}
              />
            </div>
            <div className="p-4 border-t border-[var(--border)] flex gap-2">
              <button onClick={() => setQtyEditItemId(null)} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_SECONDARY}`}>{t("billing.cancel")}</button>
              <button onClick={applyQtyEditor} className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>{t("billing.apply")}</button>
            </div>
          </>
        )}

        {screen === "cart" && qtyEditItemId === null && (
          <>
            <div className="h-[60px] px-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[var(--text)] shrink-0">{t("billing.currentBill")}</h2>
              <div className="flex items-center gap-2 min-w-0">
                {store.has_cuisines && (
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="text-xs px-2 py-1.5 rounded-md border border-[var(--border)] max-w-[110px]"
                  >
                    <option value="">{t("billing.noTable")}</option>
                    {tables.map((t) => <option key={t.table_id} value={t.table_id}>{t.label}</option>)}
                  </select>
                )}
                {heldSales.length > 0 && (
                  <button
                    onClick={() => setShowHeldList(true)}
                    className="text-xs px-2 py-1.5 rounded-md bg-[var(--warning-bg)] text-[var(--warning-text)] font-medium whitespace-nowrap"
                  >
                    {t("billing.held")} ({heldSales.length})
                  </button>
                )}
                <span className="text-xs text-[var(--text-muted)] shrink-0">{cart.length} {t("billing.lines")}</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-10">{t("billing.cartEmpty")}</p>}
              {cart.map((l) => (
                <div key={l.item.item_id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text)] truncate">{l.item.name}</div>
                    <div className="text-xs font-mono text-[var(--text-muted)]"><Money value={l.item.price} /> × {l.qty}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => changeQty(l.item.item_id, -1)} className="w-6 h-6 rounded-md border border-[var(--border)]">−</button>
                    <button onClick={() => openQtyEditor(l)} className="w-8 text-center text-sm font-mono font-semibold text-[var(--accent)] bg-[var(--accent)]/15 rounded-md py-0.5">
                      {l.qty}
                    </button>
                    <button onClick={() => changeQty(l.item.item_id, 1)} className="w-6 h-6 rounded-md border border-[var(--border)]">+</button>
                    <button onClick={() => removeLine(l.item.item_id)} className="w-6 h-6 text-[var(--danger)]">×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[var(--border)] space-y-1.5">
              <div className="flex justify-between text-sm text-[var(--text-muted)]">
                <span>{t("billing.estimatedTotal")}</span>
                <Money value={estimatedTotal} />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">{t("billing.estimatedTotalNote")}</p>
              <div className="flex gap-2 mt-2">
                <button
                  disabled={cart.length === 0 || holding || !hasPermission("SALES.HOLD_RESUME")}
                  onClick={holdCurrentSale}
                  className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_SECONDARY}`}
                >
                  {holding ? t("billing.holding") : t("billing.hold")}
                </button>
                <button
                  disabled={cart.length === 0 || !hasPermission("SALES.CREATE")}
                  onClick={goToPayment}
                  className={`flex-1 py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
                >
                  {t("billing.charge")}
                </button>
              </div>
            </div>
          </>
        )}

        {screen === "payment" && !payMode && (
          <>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <button onClick={() => setScreen("cart")}>←</button>
              <h2 className="font-semibold text-[var(--text)]">{t("billing.payment.title")}</h2>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="text-center mb-6">
                <p className="text-xs text-[var(--text-muted)]">{t("billing.payment.estimatedAmountDue")}</p>
                <p className="text-3xl font-semibold font-mono tabular-nums text-[var(--accent)]"><Money value={estimatedTotal} /></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_MODES.map((m) => (
                  <button key={m.id} onClick={() => setPayMode(m.id)} className="px-3 py-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] text-sm font-medium text-[var(--text)]">
                    {t(m.label)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {screen === "payment" && payMode === "cash" && (
          <>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <button onClick={() => setPayMode(null)}>←</button>
              <h2 className="font-semibold text-[var(--text)]">{t("billing.payment.cashTitle")}</h2>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="text-3xl font-mono tabular-nums font-semibold text-[var(--text)] mb-4 border-b-2 border-[var(--accent)] pb-2 text-center">
                {cashTendered || "0"} €
              </div>
              <NumberPad onDigit={(k) => setCashTendered((d) => d + k)} onBackspace={() => setCashTendered((d) => d.slice(0, -1))} />
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <button
                disabled={processing || !cashTendered}
                onClick={() => submitSale({ tendered_amount: parseFloat(cashTendered) })}
                className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
              >
                {processing ? t("billing.payment.processing") : t("billing.payment.completeCashSale")}
              </button>
            </div>
          </>
        )}

        {screen === "payment" && (payMode === "card" || payMode === "debit" || payMode === "wallet") && (
          <>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <button onClick={() => setPayMode(null)} disabled={processing}>←</button>
              <h2 className="font-semibold text-[var(--text)]">{t(PAYMENT_MODES.find((m) => m.id === payMode)?.label ?? "")}</h2>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
              <button disabled={processing} onClick={() => submitSale({})} className={`px-6 py-3 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>
                {processing ? t("billing.payment.processing") : t("billing.payment.simulateApproval")}
              </button>
            </div>
          </>
        )}

        {screen === "payment" && payMode === "gift" && (
          <>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <button onClick={() => setPayMode(null)}>←</button>
              <h2 className="font-semibold text-[var(--text)]">{t("billing.payment.giftTitle")}</h2>
            </div>
            <div className="p-6 flex-1">
              <input value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder={t("billing.payment.giftPlaceholder")} className="w-full mb-5 px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm font-mono" />
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <button disabled={processing || !giftCode} onClick={() => submitSale({ gift_card_code: giftCode })} className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>
                {processing ? t("billing.payment.processing") : t("billing.payment.applyAndCharge")}
              </button>
            </div>
          </>
        )}

        {screen === "payment" && payMode === "split" && (
          <>
            <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
              <button onClick={() => setPayMode(null)}>←</button>
              <h2 className="font-semibold text-[var(--text)]">{t("billing.payment.splitTitle")}</h2>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-[var(--text-muted)]">{t("billing.payment.cardPortion")}</span>
                <span className="font-mono font-semibold">{splitCardAmt || "0"} €</span>
              </div>
              <NumberPad onDigit={(k) => setSplitCardAmt((d) => d + k)} onBackspace={() => setSplitCardAmt((d) => d.slice(0, -1))} />
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <button
                disabled={processing || !splitCardAmt}
                onClick={() =>
                  submitSale({
                    split_card_amount: parseFloat(splitCardAmt),
                    split_cash_amount: Math.max(0, estimatedTotal - parseFloat(splitCardAmt || "0")),
                  })
                }
                className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
              >
                {processing ? t("billing.payment.processing") : t("billing.payment.completeSplitPayment")}
              </button>
            </div>
          </>
        )}

        {screen === "receipt" && completedSale && (
          <>
            <div className="p-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)]">{t("billing.receipt.paymentComplete")}</h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="border border-dashed border-[var(--border)] rounded-lg p-4 font-mono text-xs text-[var(--text)] bg-[var(--surface-3)]">
                <p className="text-center font-semibold mb-1">SMARTPOS</p>
                <p className="text-center text-[var(--text-muted)] mb-3">{t("billing.receipt.label")} {completedSale.receipt_number}</p>
                <div className="border-t border-dashed border-[var(--border)] pt-2 space-y-1">
                  {completedSale.lines.map((l) => (
                    <div key={l.sale_line_id} className="flex justify-between">
                      <span>{l.item_name} x{l.quantity}</span>
                      <span className="text-[var(--accent)] font-medium"><Money value={l.line_total} /></span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-[var(--border)] mt-2 pt-2 space-y-1">
                  <div className="flex justify-between"><span>{t("billing.receipt.subtotal")}</span><Money value={completedSale.subtotal} /></div>
                  <div className="flex justify-between"><span>{t("billing.receipt.vat")}</span><Money value={completedSale.tax_total} /></div>
                  <div className="flex justify-between font-semibold text-[var(--accent)]"><span>{t("billing.receipt.total")}</span><Money value={completedSale.total} /></div>
                </div>
                {completedSale.payment_method === "cash" && (
                  <div className="border-t border-dashed border-[var(--border)] mt-2 pt-2 space-y-1">
                    <div className="flex justify-between"><span>{t("billing.receipt.tendered")}</span><Money value={completedSale.tendered_amount ?? 0} /></div>
                    <div className="flex justify-between"><span>{t("billing.receipt.change")}</span><Money value={completedSale.change_amount ?? 0} /></div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <button onClick={startNewSale} className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}>{t("billing.newSale")}</button>
            </div>
          </>
        )}
      </div>
    </div>

    {showHeldList && (
      <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--surface)] rounded-xl p-6 max-h-[80vh] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">{t("billing.heldTickets")}</h2>
            <button onClick={() => setShowHeldList(false)} className="text-sm text-[var(--text-muted)] hover:underline">{t("billing.close")}</button>
          </div>

          {heldSales.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">{t("billing.noHeldTickets")}</p>
          ) : (
            <div className="space-y-2">
              {heldSales.map((sale) => {
                const table = tables.find((t) => t.table_id === sale.table_id);
                return (
                  <button
                    key={sale.sale_id}
                    onClick={() => resumeHeldSale(sale.sale_id)}
                    className="w-full text-left rounded-lg border border-[var(--border)] p-3 hover:border-[var(--accent)] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[var(--text)]">{sale.receipt_number}</span>
                      <span className="font-mono tabular-nums text-sm font-semibold text-[var(--accent)]"><Money value={sale.total} /></span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{sale.lines.length} {sale.lines.length === 1 ? t("billing.item") : t("billing.items")}</span>
                      {table && <span>{table.label}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
    </AppShell>
  );
}
