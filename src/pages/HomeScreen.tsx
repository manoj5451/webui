import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_SCREENS } from "../navConfig";
import AppShell from "../components/AppShell";

export default function HomeScreen() {
  const { user, hasPermission } = useAuth();
  const available = NAV_SCREENS.filter((s) => hasPermission(s.permission));

  return (
    <AppShell>
    <div className="bg-[#F0FAF4] h-full flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-[#F7FDF9] rounded-xl border border-[#D3EEDD] p-8">
        <h1 className="text-lg font-semibold text-[#0F3D2E] mb-1">Welcome, {user?.username}</h1>
        <p className="text-sm text-[#4B6B57] mb-6">{user?.role_name}</p>

        {available.length > 0 ? (
          <div className="space-y-2">
            {available.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                className="block w-full text-center py-2.5 rounded-lg bg-[#16A34A] text-white font-semibold"
              >
                {s.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#4B6B57]">
            No screens are built for the {user?.role_name} role yet — Reports and the Store
            Manager dashboard are planned but not implemented. Nothing is broken; there's just
            nowhere to send you yet.
          </p>
        )}
      </div>
    </div>
    </AppShell>
  );
}
