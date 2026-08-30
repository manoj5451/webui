/**
 * src/styles/uiEffects.ts
 *
 * Dark mode + Amber accent system ("warm, cash-register feel"), now
 * using CSS variables (defined in index.css, toggled via ThemeContext)
 * instead of literal hex values — this is what makes these same
 * classes correctly repaint for light mode too, with zero per-component
 * logic. See index.css for the full variable reference and both
 * themes' values.
 */

export const GLOSSY_BUTTON_PRIMARY =
  "bg-gradient-to-b from-[var(--accent-light)] via-[var(--accent)] to-[var(--accent-dark)] text-[var(--text-on-accent)] " +
  "shadow-[0_3px_10px_rgba(245,166,35,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] " +
  "hover:shadow-[0_5px_16px_rgba(245,166,35,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] hover:-translate-y-px " +
  "active:translate-y-0 active:scale-[0.98] active:shadow-[0_1px_4px_rgba(245,166,35,0.4)] " +
  "disabled:opacity-40 disabled:translate-y-0 disabled:hover:shadow-none " +
  "transition-all duration-150 ease-out";

export const GLOSSY_BUTTON_SECONDARY =
  "bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] text-[var(--text)] border border-[var(--border)] " +
  "shadow-[0_1px_3px_rgba(0,0,0,0.3)] " +
  "hover:shadow-[0_3px_10px_rgba(0,0,0,0.4)] hover:-translate-y-px hover:border-[var(--accent)]/40 " +
  "active:translate-y-0 active:scale-[0.98] " +
  "disabled:opacity-40 disabled:translate-y-0 disabled:hover:shadow-none " +
  "transition-all duration-150 ease-out";

export const GLOSSY_CARD =
  "bg-gradient-to-b from-[var(--surface-3)] to-[var(--surface)] border border-[var(--border)] " +
  "shadow-[0_2px_8px_rgba(0,0,0,0.35)] " +
  "hover:shadow-[0_6px_18px_rgba(245,166,35,0.15)] hover:border-[var(--accent)]/40 hover:-translate-y-px " +
  "active:translate-y-0 active:scale-[0.99] " +
  "transition-all duration-150 ease-out";

/** Same visual language as GLOSSY_CARD but no hover lift — for status
 * tiles (e.g. table cards) that already have their own semantic
 * background color per status and shouldn't all look identical on
 * hover regardless of state. */
export const GLOSSY_STATUS_TILE =
  "shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.45)] " +
  "active:scale-[0.98] transition-all duration-150 ease-out";
