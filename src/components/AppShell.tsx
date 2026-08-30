/**
 * src/components/AppShell.tsx
 *
 * Real, shared navigation chrome — did not exist anywhere in the working
 * app before this. Each screen previously built its own simple header
 * bar independently (store name + Sign out), with no persistent nav.
 * This replaces that pattern with one component every screen wraps
 * itself in. Now wired into every screen: Home, Billing, Products,
 * Store Management, and Tables.
 *
 * Deliberately generic: doesn't assume the wrapped screen has loaded
 * store/catalog data (Home hasn't, Products/Billing/Stores have) — the
 * header shows the user's role, not a store name, so it works
 * identically regardless of which screen is inside it. It does its own
 * lightweight store-info fetch internally (see hasCuisines below) for
 * the one thing it actually needs to know about the store itself.
 */

import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useAvailableScreens } from "../hooks/useAvailableScreens";

// Inline SVG rather than a new npm dependency (lucide-react etc. was
// never actually added to this project's package.json — only the old
// design prototype had it). Standard "power" glyph, recognizable
// without a label.
function PowerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface AppShellProps {
  children: ReactNode;
  /** Bold, top-left of the header. Falls back to "SmartPOS" for
   * screens with no single current store (Super User's Home and Store
   * Management — they see all stores, not one). */
  storeName?: string;
  /** Screen-specific header action (e.g. Billing's "Customer display"
   * button) — rendered between the store name and the user profile,
   * so screen-specific controls sit in the one shared header instead
   * of screens building their own separate sub-headers. */
  headerExtra?: ReactNode;
}

export default function AppShell({ children, storeName, headerExtra }: AppShellProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const availableScreens = useAvailableScreens();

  // Amber as a highlight against dark chrome, not a big background
  // fill — the actual "dark mode + accent color" pattern (Discord,
  // Linear, GitHub dark mode), distinct from the earlier vibrant-
  // colored-sidebar approach used for the previous palette.
  const navLinkClass = (path: string) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    }`;

  return (
    <div className="flex h-screen font-sans bg-[var(--bg)]">
      <div className="w-48 bg-[var(--surface)] flex flex-col shrink-0 border-r border-[var(--border)]">
        <div className="p-4 flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[var(--accent-light)] to-[var(--accent-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center text-[var(--text-on-accent)] font-bold text-sm">S</div>
          <span className="text-[var(--text)] font-semibold text-sm">SmartPOS</span>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          <Link to="/home" className={navLinkClass("/home")}>{t("nav.home")}</Link>
          {availableScreens.map((s) => (
            <Link key={s.path} to={s.path} className={navLinkClass(s.path)}>
              {t(s.label)}
            </Link>
          ))}
        </nav>
        {/* Theme toggle — bottom of the sidebar, always visible, not
            buried in a menu. Icon-only with a title tooltip, matching
            the same pattern already used for Sign out. */}
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0 gap-4">
          <span className="text-sm font-bold text-[var(--text)] truncate">{storeName ?? "SmartPOS"}</span>
          <div className="flex items-center gap-4 shrink-0">
            {headerExtra}
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {user?.username} <span className="text-[var(--text-muted)]/70">· {user?.role_name}</span>
            </span>
            <button onClick={logout} title={t("signOut")} className="text-[var(--text-muted)] hover:text-[var(--accent)] hover:scale-110 active:scale-95 transition-all">
              <PowerIcon />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[var(--bg)]">
          {children}
        </div>
      </div>
    </div>
  );
}
