import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginScreen from "./pages/LoginScreen";
import ChangePasswordScreen from "./pages/ChangePasswordScreen";
import HomeScreen from "./pages/HomeScreen";
import BillingScreen from "./pages/BillingScreen";
import StoreManagementScreen from "./pages/StoreManagementScreen";
import ProductInventoryScreen from "./pages/ProductInventoryScreen";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/change-password" element={<ChangePasswordScreen />} />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute requirePermission="SALES.CREATE">
                <BillingScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stores"
            element={
              <ProtectedRoute requirePermission="STORES.VIEW_ALL">
                <StoreManagementScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute requirePermission="PRODUCTS.MANAGE">
                <ProductInventoryScreen />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
