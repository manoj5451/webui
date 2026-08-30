import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useErrorDialog } from "../context/ErrorDialogContext";
import { GLOSSY_BUTTON_PRIMARY } from "../styles/uiEffects";

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const { showError } = useErrorDialog();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.must_change_password) {
        navigate("/change-password");
        return;
      }
      // Cashier's only meaningful destination is Billing anyway — Home
      // would show them exactly one button. Checked via the actual
      // SALES.CREATE permission on the just-returned user object
      // (not context's hasPermission(), to avoid any question of
      // whether context has committed the new user yet) rather than a
      // role-name string check, keeping this consistent with how the
      // rest of the app gates by permission, not role.
      //
      // Every other role still lands on the permission-aware Home
      // screen rather than a guessed role-specific path — Store
      // Manager, for example, has no screen with a matching permission
      // in what's built so far, and a guessed redirect would send them
      // straight into a "permission denied" wall.
      if (user.permissions.includes("SALES.CREATE")) {
        navigate("/billing");
        return;
      }
      navigate("/home");
    } catch (err) {
      showError(err instanceof Error ? err.message : t("login.error.fallback"), "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[var(--bg)]">
      <div className="hidden md:flex flex-col justify-between w-[42%] bg-[var(--surface)] border-r border-[var(--border)] text-[var(--text)] p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-b from-[var(--accent-light)] to-[var(--accent-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] flex items-center justify-center font-bold text-[var(--text-on-accent)]">S</div>
          <span className="font-semibold tracking-tight text-lg">SmartPOS</span>
        </div>
        <div>
          <p className="text-3xl font-semibold tracking-tight leading-snug mb-3">
            {t("login.taglineLine1")}<br />{t("login.taglineLine2")}
          </p>
        </div>
        <p className="text-[var(--text-muted)]/60 text-xs">© 2026 SmartPOS.</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] mb-1">{t("login.signIn")}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">{t("login.subtitle")}</p>

          <label className="text-xs font-medium text-[var(--text-muted)]">{t("login.username")}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            autoComplete="username"
          />

          <label className="text-xs font-medium text-[var(--text-muted)]">{t("login.password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
          >
            {loading ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
