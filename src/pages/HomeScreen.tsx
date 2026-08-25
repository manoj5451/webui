import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SCREENS = [
  { path: "/billing", label: "Billing", permission: "SALES.CREATE" },
  { path: "/stores", label: "Store Management", permission: "STORES.VIEW_ALL" },
  { path: "/products", label: "Products & Inventory", permission: "PRODUCTS.MANAGE" },
];

export default function HomeScreen() {
  const { user, hasPermission, logout } = useAuth();
  const available = SCREENS.filter((s) => hasPermission(s.permission));

  return (
    <div className="min-h-screen bg-[#F2F6F6] flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-white rounded-xl border border-[#DCE6E4] p-8">
        <h1 className="text-lg font-semibold text-[#0F1F2E] mb-1">Welcome, {user?.username}</h1>
        <p className="text-sm text-[#4A5A66] mb-6">{user?.role_name}</p>

        {available.length > 0 ? (
          <div className="space-y-2">
            {available.map((s) => (
              <Link
                key={s.path}
                to={s.path}
                className="block w-full text-center py-2.5 rounded-lg bg-[#12876F] text-white font-semibold"
              >
                {s.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#4A5A66]">
            No screens are built for the {user?.role_name} role yet — Reports and the Store
            Manager dashboard are planned but not implemented. Nothing is broken; there's just
            nowhere to send you yet.
          </p>
        )}

        <button onClick={logout} className="w-full mt-6 text-xs text-[#4A5A66] hover:underline">
          Sign out
        </button>
      </div>
    </div>
  );
}
