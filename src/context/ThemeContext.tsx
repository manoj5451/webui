/**
 * src/context/ThemeContext.tsx
 *
 * Sets a data-theme attribute on <html>, which the CSS variables in
 * index.css key off of — this is what actually makes every bg-[var(--x)]
 * class across the app repaint instantly on toggle, no per-component
 * logic needed. Same provider/hook/localStorage pattern already used
 * for AuthContext and LanguageContext, for consistency.
 *
 * Defaults to dark (matches the current design direction — "warm,
 * cash-register feel" — and what's already shipped); persisted per
 * browser, same tradeoff already accepted for the language setting.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "smartpos_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
