import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useErrorDialog } from "../context/ErrorDialogContext";
import { GLOSSY_BUTTON_PRIMARY, GLOSSY_CARD } from "../styles/uiEffects";

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const { showError } = useErrorDialog();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError(t("changePassword.mismatch"));
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      // The user's cached must_change_password flag is now stale (it
      // was baked into the JWT at login and this endpoint doesn't
      // re-issue a token) — simplest correct fix is to sign out and
      // have them log back in with the new password, getting a fresh
      // token with must_change_password: false.
      logout();
      navigate("/login");
    } catch (err) {
      showError(err instanceof Error ? err.message : t("changePassword.error.fallback"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg)] p-8">
      <form onSubmit={handleSubmit} className={`w-full max-w-sm rounded-xl p-8 ${GLOSSY_CARD}`}>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] mb-1">{t("changePassword.title")}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {t("changePassword.subtitle")}
        </p>

        <label className="text-xs font-medium text-[var(--text-muted)]">{t("changePassword.current")}</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />

        <label className="text-xs font-medium text-[var(--text-muted)]">{t("changePassword.new")}</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />

        <label className="text-xs font-medium text-[var(--text-muted)]">{t("changePassword.confirm")}</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 rounded-lg font-semibold ${GLOSSY_BUTTON_PRIMARY}`}
        >
          {loading ? t("changePassword.updating") : t("changePassword.submit")}
        </button>
      </form>
    </div>
  );
}
