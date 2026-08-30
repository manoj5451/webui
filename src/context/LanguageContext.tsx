/**
 * src/context/LanguageContext.tsx
 *
 * Live per-browser toggle, not a per-store backend setting — see the
 * reasoning in chat: this needs zero backend changes (no new column,
 * no migration), and can already emulate "this store always shows
 * French" simply by never touching the toggle.
 *
 * Temporarily NOT reading the persisted value from localStorage —
 * the toggle UI was removed from Login/AppShell per explicit direction
 * ("English for now, French later"), and with no button left to call
 * setLanguage("en"), a browser that had previously saved "fr" (from
 * testing the toggle before it was removed) would be permanently
 * stuck in French with no way back. Always starting on "en" avoids
 * that trap. setLanguage() and localStorage.setItem() are both still
 * fully wired below — re-enable the read on init once the toggle
 * comes back, and existing saved preferences will resume working
 * immediately, no other changes needed.
 *
 * Deliberately does NOT sync live across windows via BroadcastChannel
 * the way cart state does for Customer Display — a language toggle is
 * a rare event, not a per-second one, and localStorage already means
 * a freshly-opened Customer Display window picks up the current
 * language on its own. If the cashier changes language while a
 * Customer Display window is already open, that window won't update
 * until it's reopened — a stated, small scope boundary, not an
 * oversight.
 */

import { createContext, useContext, useState, ReactNode } from "react";
import { translations, type Language } from "../i18n/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_KEY = "smartpos_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  const setLanguage = (lang: Language) => {
    localStorage.setItem(LANGUAGE_KEY, lang);
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const value = translations[language][key];
    if (value === undefined) {
      // Falls back to the key itself rather than throwing — a missing
      // translation should be visibly wrong (easy to spot and fix),
      // never a crash.
      return key;
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
