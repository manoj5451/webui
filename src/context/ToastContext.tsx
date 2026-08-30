/**
 * src/context/ToastContext.tsx
 *
 * Replaces raw browser alert() with a real, non-blocking toast —
 * only one alert() existed in the whole app (StoreManagementScreen's
 * error handling), but a native alert() reads as "unfinished
 * prototype" in a client demo regardless of how rarely it fires.
 *
 * Same provider/hook pattern as AuthContext and LanguageContext, for
 * consistency with how the rest of the app's shared state works.
 */

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type ToastKind = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    // Auto-dismiss — a toast that never goes away is just a worse alert().
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium shadow-[0_8px_20px_rgba(0,0,0,0.18)] animate-toastIn ${
              t.kind === "error" ? "bg-[#3A1515] border border-[#5C2323] text-[#FCA5A5]" : "bg-[#14291F] border border-[#1F4A35] text-[#E7ECF2]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${t.kind === "error" ? "bg-[#F87171]" : "bg-[#34D399]"}`} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
