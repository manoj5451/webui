import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.must_change_password) {
        navigate("/change-password");
        return;
      }
      // Land on a permission-aware home screen rather than guessing a
      // role-specific path — Store Manager, for example, has no screen
      // with a matching permission in what's built so far, and a guessed
      // redirect would send them straight into a "permission denied" wall.
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F2F6F6]">
      <div className="hidden md:flex flex-col justify-between w-[42%] bg-[#0F1F2E] text-white p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#12876F] flex items-center justify-center font-bold">S</div>
          <span className="font-semibold tracking-tight text-lg">SmartPOS</span>
        </div>
        <div>
          <p className="text-3xl font-semibold tracking-tight leading-snug mb-3">
            One register.<br />Every kind of store.
          </p>
        </div>
        <p className="text-white/40 text-xs">© 2026 SmartPOS.</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F1F2E] mb-1">Sign in</h1>
          <p className="text-sm text-[#4A5A66] mb-6">Access your SmartPOS workspace.</p>

          <label className="text-xs font-medium text-[#4A5A66]">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#12876F]/40"
            autoComplete="username"
          />

          <label className="text-xs font-medium text-[#4A5A66]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2.5 rounded-lg border border-[#DCE6E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#12876F]/40"
            autoComplete="current-password"
          />

          {error && <p className="text-xs text-[#C1443A] mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#12876F] text-white font-semibold disabled:opacity-40"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
