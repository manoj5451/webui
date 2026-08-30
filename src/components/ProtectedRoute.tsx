/**
 * src/components/ProtectedRoute.tsx
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePermission?: string;
}

export default function ProtectedRoute({ children, requirePermission }: ProtectedRouteProps) {
  const { isAuthenticated, user, hasPermission } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.must_change_password) return <Navigate to="/change-password" replace />;
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <div className="p-8 text-sm text-[var(--text-muted)] bg-[var(--bg)] min-h-screen">
        You don't have permission to view this page. ({requirePermission})
      </div>
    );
  }
  return <>{children}</>;
}
