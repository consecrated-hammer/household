import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./routes/AppLayout.jsx";
import { IncomePage } from "./pages/Income/IncomePage.jsx";
import { ExpensesPage } from "./pages/Expenses/ExpensesPage.jsx";
import { SettingsPage } from "./pages/Settings/SettingsPage.jsx";
import { AllocationsPage } from "./pages/Allocations/AllocationsPage.jsx";
import { LoginPage } from "./pages/Login/LoginPage.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { SettingsProvider } from "./contexts/SettingsContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SettingsProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/income" element={<IncomePage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/allocations" element={<AllocationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/income" replace />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
