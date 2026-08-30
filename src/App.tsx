import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./context/ToastContext";
import { ErrorDialogProvider } from "./context/ErrorDialogContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginScreen from "./pages/LoginScreen";
import ChangePasswordScreen from "./pages/ChangePasswordScreen";
import HomeScreen from "./pages/HomeScreen";
import BillingScreen from "./pages/BillingScreen";
import StoreManagementScreen from "./pages/StoreManagementScreen";
import ProductInventoryScreen from "./pages/ProductInventoryScreen";
import CustomerDisplayScreen from "./pages/CustomerDisplayScreen";
import TableManagementScreen from "./pages/TableManagementScreen";

export default function App() {
  return (
    <ThemeProvider>
    <LanguageProvider>
    <ToastProvider>
    <ErrorDialogProvider>
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
            path="/customer-display"
            element={
              // No specific permission required — this window only
              // listens on BroadcastChannel, it never calls an API.
              // Still behind ProtectedRoute so a direct, unauthenticated
              // visit to the URL redirects to /login rather than
              // rendering. Shares the same localStorage session as the
              // cashier's tab since window.open() opens same-origin.
              <ProtectedRoute>
                <CustomerDisplayScreen />
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
          <Route
            path="/tables"
            element={
              <ProtectedRoute requirePermission="TABLES.MANAGE">
                <TableManagementScreen />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorDialogProvider>
    </ToastProvider>
    </LanguageProvider>
    </ThemeProvider>
  );
}
