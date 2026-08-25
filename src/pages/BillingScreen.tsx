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
import { useCatalog } from "../hooks/useCatalog";
import type { Item, Category } from "../api/catalogApi";
import { createSale } from "../api/salesApi";
import type { PaymentMethod, SaleOut } from "../api/salesApi";
import NumberPad from "../components/NumberPad";
import type { DisplayMessage } from "./CustomerDisplayScreen";

interface CartLine {
  item: Item;
  qty: number;
}

function Money({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">${value.toFixed(2)}</span>;
}

const PAYMENT_MODES: { id: PaymentMethod; label: string }[] = [
  { id: "card", label: "Credit Card" },
  { id: "debit", label: "Debit Card" },
  { id: "cash", label: "Cash" },
  { id: "wallet", label: "Digital Wallet" },
  { id: "gift", label: "Gift Card" },
  { id: "split", label: "Split Payment" },
];

export default function BillingScreen() {
  const { user, hasPermission, logout } = useAuth();
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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<SaleOut | null>(null);

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
    return <div className="p-8 text-sm text-[#C1443A]">No store assigned to this account.</div>;
  }
  if (isLoading || !catalog) {
    return <div className="p-8 text-sm text-[#4A5A66]">Loading catalog…</div>;
  }
  if (error) {
    return <div className="p-8 text-sm text-[#C1443A]">Couldn't load the catalog: {error}</div>;
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
    setCheckoutError(null);
  };
  const goToPayment = () => {
    resetPayment();
    setScreen("payment");
  };

  const submitSale = async (extra: Partial<Parameters<typeof createSale>[0]> = {}) => {
    if (!storeId) return;
    setProcessing(true);
    setCheckoutError(null);
    try {
      const sale = await createSale({
        store_id: storeId,
        lines: cart.map((l) => ({ item_id: l.item.item_id, quantity: l.qty })),
        payment_method: payMode as PaymentMethod,
        ...extra,
      });
      setCompletedSale(sale);
      setScreen("receipt");
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setProcessing(false);
    }
  };

  const startNewSale = () => {
    setCart([]);
    resetPayment();
    setCompletedSale(null);
    setScreen("cart");
  };

  return (
    <div className="flex h-screen font-sans">
      <div className="w-44 bg-[#EFF5F4] border-r border-[#DCE6E4] flex flex-col shrink-0 overflow-auto">
        <div className="p-3 border-b border-[#DCE6E4] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#0F1F2E]">{store.store_name}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                window.open(
                  "/customer-display",
                  "customerDisplay",
                  "width=900,height=700,menubar=no,toolbar=no,location=no"
                )
              }
              className="text-[10px] text-[#12876F] hover:underline"
              title="Opens a second window — drag it onto the customer-facing monitor"
            >
              Customer display
            </button>
            <button onClick={logout} className="text-[10px] text-[#4A5A66] hover:underline">Sign out</button>
          </div>
        </div>
        {store.has_cuisines && (
          <div className="p-3 border-b border-[#DCE6E4]">
            <label className="text-[10px] uppercase tracking-wide font-semibold text-[#4A5A66]">Cuisine</label>
            <select
              value={activeCuisineId ?? ""}
              onChange={(e) => {
                setSelectedCuisineId(Number(e.target.value));
                setActiveCategoryId(null);
              }}
              className="w-full mt-1 px-2 py-2 rounded-lg border border-[#DCE6E4] text-sm"
            >
              {cuisines.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="p-2 space-y-1">
          {railCategories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setActiveCategoryId(c.category_id)}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium relative transition-colors ${
                currentCategoryId === c.category_id ? "bg-[#0F1F2E] text-white" : "text-[#4A5A66] hover:bg-white"
              }`}
            >
              {currentCategoryId === c.category_id && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-[#12876F]" />
              )}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-[#DCE6E4] bg-[#EFF5F4] flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={store.requires_barcode ? "Search or scan barcode…" : "Search…"}
            className="flex-1 max-w-md px-3 py-2 rounded-lg border border-[#DCE6E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#12876F]/40"
          />
        </div>
        <div className="flex-1 overflow-auto p-4 grid grid-cols-3 gap-3 content-start">
          {visibleItems.map((it) => (
            <button
              key={it.item_id}
              onClick={() => addToCart(it)}
              disabled={!it.is_available}
              className="text-left bg-white border border-[#DCE6E4] rounded-xl p-4 hover:border-[#12876F] hover:shadow-sm transition-all disabled:opacity-40"
            >
              <div className="text-sm font-medium text-[#0F1F2E] mb-1">{it.name}</div>
              <div className="flex items-center justify-between">
                <span className="font-mono tabular-nums font-semibold text-[#0F1F2E]"><Money value={it.price} /></span>
                {it.inventory && <span className="text-[11px] text-[#4A5A66]">{it.inventory.quantity_on_hand} in stock</span>}
              </div>
            </button>
          ))}
          {visibleItems.length === 0 && (
            <div className="col-span-3 text-center text-sm text-[#4A5A66] py-12">No items in this category.</div>
          )}
        </div>
      </div>

      <div className="w-96 bg-white border-l border-[#DCE6E4] flex flex-col shrink-0">
        {screen === "cart" && qtyEditItemId !== null && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center gap-2">
              <button onClick={() => setQtyEditItemId(null)}>←</button>
              <h2 className="font-semibold text-[#0F1F2E]">Set quantity</h2>
            </div>
            <div className="p-6 flex-1">
              <div className="text-3xl font-mono tabular-nums font-semibold text-[#0F1F2E] mb-5 border-b-2 border-[#12876F] pb-2 text-center">
                {qtyDraft || "0"}
              </div>
              <NumberPad
                onDigit={(k) => setQtyDraft((d) => (d === "0" ? k : d + k))}
                onBackspace={() => setQtyDraft((d) => d.slice(0, -1) || "0")}
              />
            </div>
            <div className="p-4 border-t border-[#DCE6E4] flex gap-2">
              <button onClick={() => setQtyEditItemId(null)} className="flex-1 py-2.5 rounded-lg border border-[#DCE6E4]">Cancel</button>
              <button onClick={applyQtyEditor} className="flex-1 py-2.5 rounded-lg bg-[#12876F] text-white font-semibold">Apply</button>
            </div>
          </>
        )}

        {screen === "cart" && qtyEditItemId === null && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center justify-between">
              <h2 className="font-semibold text-[#0F1F2E]">Current bill</h2>
              <span className="text-xs text-[#4A5A66]">{cart.length} lines</span>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 && <p className="text-sm text-[#4A5A66] text-center py-10">Cart is empty. Tap an item to add it.</p>}
              {cart.map((l) => (
                <div key={l.item.item_id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#0F1F2E] truncate">{l.item.name}</div>
                    <div className="text-xs font-mono text-[#4A5A66]"><Money value={l.item.price} /> × {l.qty}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => changeQty(l.item.item_id, -1)} className="w-6 h-6 rounded-md border border-[#DCE6E4]">−</button>
                    <button onClick={() => openQtyEditor(l)} className="w-8 text-center text-sm font-mono font-semibold text-[#0C5A4B] bg-[#D9EFE9]/50 rounded-md py-0.5">
                      {l.qty}
                    </button>
                    <button onClick={() => changeQty(l.item.item_id, 1)} className="w-6 h-6 rounded-md border border-[#DCE6E4]">+</button>
                    <button onClick={() => removeLine(l.item.item_id)} className="w-6 h-6 text-[#C1443A]">×</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#DCE6E4] space-y-1.5">
              <div className="flex justify-between text-sm text-[#4A5A66]">
                <span>Estimated total</span>
                <Money value={estimatedTotal} />
              </div>
              <p className="text-[11px] text-[#4A5A66]">Final total, including VAT, is calculated at checkout.</p>
              <button
                disabled={cart.length === 0 || !hasPermission("SALES.CREATE")}
                onClick={goToPayment}
                className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40 mt-2"
              >
                Charge
              </button>
            </div>
          </>
        )}

        {screen === "payment" && !payMode && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center gap-2">
              <button onClick={() => setScreen("cart")}>←</button>
              <h2 className="font-semibold text-[#0F1F2E]">Payment</h2>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="text-center mb-6">
                <p className="text-xs text-[#4A5A66]">Estimated amount due</p>
                <p className="text-3xl font-semibold font-mono tabular-nums text-[#0F1F2E]"><Money value={estimatedTotal} /></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_MODES.map((m) => (
                  <button key={m.id} onClick={() => setPayMode(m.id)} className="px-3 py-4 rounded-lg border border-[#DCE6E4] hover:border-[#12876F] text-sm font-medium text-[#0F1F2E]">
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {screen === "payment" && payMode === "cash" && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center gap-2">
              <button onClick={() => setPayMode(null)}>←</button>
              <h2 className="font-semibold text-[#0F1F2E]">Cash payment</h2>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="text-3xl font-mono tabular-nums font-semibold text-[#0F1F2E] mb-4 border-b-2 border-[#12876F] pb-2 text-center">
                ${cashTendered || "0"}
              </div>
              <NumberPad onDigit={(k) => setCashTendered((d) => d + k)} onBackspace={() => setCashTendered((d) => d.slice(0, -1))} />
              {checkoutError && <p className="text-xs text-[#C1443A] mt-3">{checkoutError}</p>}
            </div>
            <div className="p-4 border-t border-[#DCE6E4]">
              <button
                disabled={processing || !cashTendered}
                onClick={() => submitSale({ tendered_amount: parseFloat(cashTendered) })}
                className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40"
              >
                {processing ? "Processing…" : "Complete cash sale"}
              </button>
            </div>
          </>
        )}

        {screen === "payment" && (payMode === "card" || payMode === "debit" || payMode === "wallet") && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center gap-2">
              <button onClick={() => setPayMode(null)} disabled={processing}>←</button>
              <h2 className="font-semibold text-[#0F1F2E]">{PAYMENT_MODES.find((m) => m.id === payMode)?.label}</h2>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
              {checkoutError && <p className="text-xs text-[#C1443A] mb-3">{checkoutError}</p>}
              <button disabled={processing} onClick={() => submitSale({})} className="px-6 py-3 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40">
                {processing ? "Processing…" : "Simulate approval"}
              </button>
            </div>
          </>
        )}

        {screen === "payment" && payMode === "gift" && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center gap-2">
              <button onClick={() => setPayMode(null)}>←</button>
              <h2 className="font-semibold text-[#0F1F2E]">Gift card</h2>
            </div>
            <div className="p-6 flex-1">
              <input value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder="Scan or enter code" className="w-full mb-5 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm font-mono" />
              {checkoutError && <p className="text-xs text-[#C1443A]">{checkoutError}</p>}
            </div>
            <div className="p-4 border-t border-[#DCE6E4]">
              <button disabled={processing || !giftCode} onClick={() => submitSale({ gift_card_code: giftCode })} className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40">
                {processing ? "Processing…" : "Apply & charge"}
              </button>
            </div>
          </>
        )}

        {screen === "payment" && payMode === "split" && (
          <>
            <div className="p-4 border-b border-[#DCE6E4] flex items-center gap-2">
              <button onClick={() => setPayMode(null)}>←</button>
              <h2 className="font-semibold text-[#0F1F2E]">Split payment</h2>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-[#4A5A66]">Card portion</span>
                <span className="font-mono font-semibold">${splitCardAmt || "0"}</span>
              </div>
              <NumberPad onDigit={(k) => setSplitCardAmt((d) => d + k)} onBackspace={() => setSplitCardAmt((d) => d.slice(0, -1))} />
              {checkoutError && <p className="text-xs text-[#C1443A] mt-3">{checkoutError}</p>}
            </div>
            <div className="p-4 border-t border-[#DCE6E4]">
              <button
                disabled={processing || !splitCardAmt}
                onClick={() =>
                  submitSale({
                    split_card_amount: parseFloat(splitCardAmt),
                    split_cash_amount: Math.max(0, estimatedTotal - parseFloat(splitCardAmt || "0")),
                  })
                }
                className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40"
              >
                {processing ? "Processing…" : "Complete split payment"}
              </button>
            </div>
          </>
        )}

        {screen === "receipt" && completedSale && (
          <>
            <div className="p-4 border-b border-[#DCE6E4]">
              <h2 className="font-semibold text-[#0F1F2E]">Payment complete</h2>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="border border-dashed border-[#DCE6E4] rounded-lg p-4 font-mono text-xs text-[#0F1F2E] bg-[#F7FAF9]">
                <p className="text-center font-semibold mb-1">SMARTPOS</p>
                <p className="text-center text-[#4A5A66] mb-3">Receipt {completedSale.receipt_number}</p>
                <div className="border-t border-dashed border-[#DCE6E4] pt-2 space-y-1">
                  {completedSale.lines.map((l) => (
                    <div key={l.sale_line_id} className="flex justify-between">
                      <span>{l.item_name} x{l.quantity}</span>
                      <Money value={l.line_total} />
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-[#DCE6E4] mt-2 pt-2 space-y-1">
                  <div className="flex justify-between"><span>Subtotal (pre-VAT)</span><Money value={completedSale.subtotal} /></div>
                  <div className="flex justify-between"><span>VAT</span><Money value={completedSale.tax_total} /></div>
                  <div className="flex justify-between font-semibold"><span>TOTAL</span><Money value={completedSale.total} /></div>
                </div>
                {completedSale.payment_method === "cash" && (
                  <div className="border-t border-dashed border-[#DCE6E4] mt-2 pt-2 space-y-1">
                    <div className="flex justify-between"><span>Tendered</span><Money value={completedSale.tendered_amount ?? 0} /></div>
                    <div className="flex justify-between"><span>Change</span><Money value={completedSale.change_amount ?? 0} /></div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-[#DCE6E4]">
              <button onClick={startNewSale} className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold">New sale</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
