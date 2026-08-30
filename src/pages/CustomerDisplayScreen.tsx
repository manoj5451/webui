/**
 * src/pages/CustomerDisplayScreen.tsx
 *
 * Module 1.5 — Customer-Facing Display Screen.
 *
 * Opened by the cashier as a separate pop-out window (see the "Open
 * customer display" button in BillingScreen), then dragged onto a
 * second, customer-facing monitor. Purely a listener — it never calls
 * an API itself, it just renders whatever BillingScreen broadcasts on
 * the "smartpos-customer-display" BroadcastChannel.
 *
 * Message shapes (kept in sync with the broadcaster in BillingScreen):
 *   { type: "idle" }
 *   { type: "cart", storeName, lines: [{ name, price, qty, lineTotal }], estimatedTotal }
 *   { type: "payment", amountDue }
 *   { type: "receipt", receiptNumber, total, paymentMethod, tenderedAmount?, changeAmount? }
 */

import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { formatMoney } from "../utils/formatMoney";

interface CartLineMsg {
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
}

export type DisplayMessage =
  | { type: "idle" }
  | { type: "cart"; storeName: string; lines: CartLineMsg[]; estimatedTotal: number }
  | { type: "payment"; amountDue: number }
  | {
      type: "receipt";
      receiptNumber: string;
      total: number;
      paymentMethod: string | null;
      tenderedAmount?: number | null;
      changeAmount?: number | null;
    };

function Money({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{formatMoney(value)}</span>;
}

export default function CustomerDisplayScreen() {
  const [message, setMessage] = useState<DisplayMessage>({ type: "idle" });
  // No toggle here on purpose — this pop-out window shares the same
  // origin/localStorage as the cashier's tab, so it already picks up
  // whichever language staff have set, on its own, the moment it opens.
  // A separate customer-controlled toggle wouldn't make sense for a
  // passive, read-only display anyway.
  const { t } = useLanguage();

  useEffect(() => {
    const channel = new BroadcastChannel("smartpos-customer-display");
    channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
      setMessage(event.data);
    };
    // Ask the Billing screen for the current state right away — a
    // BroadcastChannel listener that starts after cart activity has
    // already happened otherwise has nothing to show until the next
    // change, since past broadcasts aren't replayed to new listeners.
    channel.postMessage({ type: "request-sync" });
    return () => channel.close();
  }, []);

  if (message.type === "idle") {
    return (
      <div className="min-h-screen bg-[var(--customer-display-bg)] text-[var(--text)] flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[var(--accent-light)] to-[var(--accent-dark)] shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center font-bold text-5xl mb-6">S</div>
        <p className="text-4xl font-semibold tracking-tight">{t("customerDisplay.welcome")}</p>
        <p className="text-lg text-[var(--text-muted)] mt-2">{t("customerDisplay.pleaseWait")}</p>
      </div>
    );
  }

  if (message.type === "cart") {
    return (
      <div className="min-h-screen bg-[var(--customer-display-bg)] flex flex-col p-10">
        <p className="text-sm text-[var(--text-muted)] mb-6">{message.storeName}</p>
        <div className="flex-1 overflow-auto space-y-4">
          {message.lines.length === 0 && (
            <p className="text-3xl text-[var(--text-muted)] text-center mt-20">{t("customerDisplay.noItemsYet")}</p>
          )}
          {message.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <div className="text-2xl font-medium text-[var(--text)]">{l.name}</div>
                <div className="text-lg text-[var(--text-muted)]"><Money value={l.price} /> × {l.qty}</div>
              </div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[var(--text)]">
                <Money value={l.lineTotal} />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-[var(--accent)] mt-6 pt-6 flex items-center justify-between">
          <span className="text-2xl font-medium text-[var(--text)]">{t("customerDisplay.total")}</span>
          <span className="text-5xl font-mono tabular-nums font-bold text-[var(--text)]">
            <Money value={message.estimatedTotal} />
          </span>
        </div>
      </div>
    );
  }

  if (message.type === "payment") {
    return (
      <div className="min-h-screen bg-[var(--customer-display-bg)] text-[var(--text)] flex flex-col items-center justify-center">
        <p className="text-2xl text-[var(--text-muted)] mb-4">{t("customerDisplay.amountDue")}</p>
        <p className="text-7xl font-mono tabular-nums font-bold mb-8"><Money value={message.amountDue} /></p>
        <p className="text-xl text-[var(--text-muted)]">{t("customerDisplay.pleasePay")}</p>
      </div>
    );
  }

  // receipt
  return (
    <div className="min-h-screen bg-[var(--customer-display-bg)] text-[var(--text)] flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[var(--success)] to-[var(--success-dark)] shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center text-4xl mb-6">✓</div>
      <p className="text-4xl font-semibold mb-2">{t("customerDisplay.thankYou")}</p>
      <p className="text-lg text-[var(--text-muted)] mb-8">{t("billing.receipt.label")} {message.receiptNumber}</p>
      <p className="text-3xl font-mono tabular-nums mb-2"><Money value={message.total} /> {t("customerDisplay.paid")}</p>
      {message.paymentMethod === "cash" && message.changeAmount != null && (
        <p className="text-xl text-[var(--text-muted)] mt-4">{t("customerDisplay.change")}: <Money value={message.changeAmount} /></p>
      )}
    </div>
  );
}
