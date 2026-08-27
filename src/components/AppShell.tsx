/**
 * src/components/AppShell.tsx
 *
 * Real, shared navigation chrome — did not exist anywhere in the working
 * app before this. Each screen previously built its own simple header
 * bar independently (store name + Sign out), with no persistent nav.
 * This replaces that pattern with one component every screen wraps
 * itself in.
 *
 * Currently wired into ProductInventoryScreen only. Billing, Home, and
 * Store Management still use their own old headers until they get their
 * own turn — same one-screen-at-a-time rollout already used for the
 * color palette itself.
 *
 * Deliberately generic: doesn't assume the wrapped screen has loaded
 * store/catalog data (Home hasn't, Products/Billing/Stores have) — the
 * header shows the user's role, not a store name, so it works
 * identically regardless of which screen is inside it.
 */

import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_SCREENS } from "../navConfig";

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
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();
  const availableScreens = NAV_SCREENS.filter((s) => hasPermission(s.permission));

  const navLinkClass = (path: string) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path ? "bg-white/25 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="flex h-screen font-sans">
      <div className="w-48 bg-[#16A34A] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-white/25 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="text-white font-semibold text-sm">SmartPOS</span>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          <Link to="/home" className={navLinkClass("/home")}>Home</Link>
          {availableScreens.map((s) => (
            <Link key={s.path} to={s.path} className={navLinkClass(s.path)}>
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-[#15803D] flex items-center justify-between px-6 shrink-0 gap-4">
          <span className="text-sm font-bold text-white truncate">{storeName ?? "SmartPOS"}</span>
          <div className="flex items-center gap-4 shrink-0">
            {headerExtra}
            <span className="text-xs font-medium text-white/90">
              {user?.username} <span className="text-white/60">· {user?.role_name}</span>
            </span>
            <button onClick={logout} title="Sign out" className="text-white/80 hover:text-white transition-colors">
              <PowerIcon />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
