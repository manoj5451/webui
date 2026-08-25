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
  return <span className="font-mono tabular-nums">${value.toFixed(2)}</span>;
}

export default function CustomerDisplayScreen() {
  const [message, setMessage] = useState<DisplayMessage>({ type: "idle" });

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
      <div className="min-h-screen bg-[#0F1F2E] text-white flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-[#12876F] flex items-center justify-center font-bold text-5xl mb-6">S</div>
        <p className="text-4xl font-semibold tracking-tight">Welcome</p>
        <p className="text-lg text-white/50 mt-2">Please wait while we ring up your order</p>
      </div>
    );
  }

  if (message.type === "cart") {
    return (
      <div className="min-h-screen bg-[#F2F6F6] flex flex-col p-10">
        <p className="text-sm text-[#4A5A66] mb-6">{message.storeName}</p>
        <div className="flex-1 overflow-auto space-y-4">
          {message.lines.length === 0 && (
            <p className="text-3xl text-[#4A5A66] text-center mt-20">No items yet</p>
          )}
          {message.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between border-b border-[#DCE6E4] pb-3">
              <div>
                <div className="text-2xl font-medium text-[#0F1F2E]">{l.name}</div>
                <div className="text-lg text-[#4A5A66]"><Money value={l.price} /> × {l.qty}</div>
              </div>
              <div className="text-2xl font-mono tabular-nums font-semibold text-[#0F1F2E]">
                <Money value={l.lineTotal} />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-[#12876F] mt-6 pt-6 flex items-center justify-between">
          <span className="text-2xl font-medium text-[#0F1F2E]">Total</span>
          <span className="text-5xl font-mono tabular-nums font-bold text-[#0F1F2E]">
            <Money value={message.estimatedTotal} />
          </span>
        </div>
      </div>
    );
  }

  if (message.type === "payment") {
    return (
      <div className="min-h-screen bg-[#0F1F2E] text-white flex flex-col items-center justify-center">
        <p className="text-2xl text-white/60 mb-4">Amount Due</p>
        <p className="text-7xl font-mono tabular-nums font-bold mb-8"><Money value={message.amountDue} /></p>
        <p className="text-xl text-white/70">Please complete your payment</p>
      </div>
    );
  }

  // receipt
  return (
    <div className="min-h-screen bg-[#0F1F2E] text-white flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-[#3F8F4E] flex items-center justify-center text-4xl mb-6">✓</div>
      <p className="text-4xl font-semibold mb-2">Thank you!</p>
      <p className="text-lg text-white/60 mb-8">Receipt {message.receiptNumber}</p>
      <p className="text-3xl font-mono tabular-nums mb-2"><Money value={message.total} /> paid</p>
      {message.paymentMethod === "cash" && message.changeAmount != null && (
        <p className="text-xl text-white/70 mt-4">Change: <Money value={message.changeAmount} /></p>
      )}
    </div>
  );
}
