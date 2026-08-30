/**
 * src/context/ErrorDialogContext.tsx
 *
 * A real blocking modal for error messages, with an explicit OK button
 * — distinct from ToastContext, which stays as-is for non-blocking
 * success notifications. Per explicit direction: errors need a popup
 * the person must acknowledge, not something that quietly times out
 * on its own the way a toast does.
 *
 * Styled with the same GLOSSY_CARD / GLOSSY_BUTTON_PRIMARY building
 * blocks used everywhere else, and using the same CSS variables as
 * the rest of the app, so it's already in sync with both the glossy
 * treatment and whichever theme (dark/light) is currently active —
 * not a separately hand-styled one-off.
 */

import { createContext, useContext, useState, ReactNode } from "react";
import { GLOSSY_CARD, GLOSSY_BUTTON_PRIMARY } from "../styles/uiEffects";

interface ErrorDialogContextValue {
  showError: (message: string, title?: string) => void;
}

const ErrorDialogContext = createContext<ErrorDialogContextValue | undefined>(undefined);

export function ErrorDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; title: string } | null>(null);

  const showError = (message: string, title: string = "Something went wrong") => {
    setState({ message, title });
  };

  const close = () => setState(null);

  return (
    <ErrorDialogContext.Provider value={{ showError }}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-xl p-6 ${GLOSSY_CARD}`}>
            <div className="w-10 h-10 rounded-full bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-center justify-center mb-4">
              <span className="text-[var(--danger)] font-bold text-lg">!</span>
            </div>
            <h2 className="text-base font-semibold text-[var(--text)] mb-1">{state.title}</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">{state.message}</p>
            <button
              onClick={close}
              autoFocus
              className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </ErrorDialogContext.Provider>
  );
}

export function useErrorDialog(): ErrorDialogContextValue {
  const ctx = useContext(ErrorDialogContext);
  if (!ctx) throw new Error("useErrorDialog must be used within an ErrorDialogProvider");
  return ctx;
}
