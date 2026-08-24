import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";
import { useAuth } from "../context/AuthContext";

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
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
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F2F6F6] p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-[#DCE6E4] p-8">
        <h1 className="text-xl font-semibold tracking-tight text-[#0F1F2E] mb-1">Change your password</h1>
        <p className="text-sm text-[#4A5A66] mb-6">
          Your account requires a new password before continuing.
        </p>

        <label className="text-xs font-medium text-[#4A5A66]">Current (temporary) password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm"
        />

        <label className="text-xs font-medium text-[#4A5A66]">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm"
        />

        <label className="text-xs font-medium text-[#4A5A66]">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm"
        />

        {error && <p className="text-xs text-[#C1443A] mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40"
        >
          {loading ? "Updating…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
