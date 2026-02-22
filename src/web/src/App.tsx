import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/useAuth";
import { RequireAuth } from "./components/RequireAuth";
import { RequirePasswordChanged } from "./components/RequirePasswordChanged";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { Dashboard } from "./pages/Dashboard";
import { DatasetDetails } from "./pages/DatasetDetails";
import { Statistics } from "./pages/Statistics";
import { AdminUsers } from "./pages/AdminUsers";
import { Header } from "./components/Header";

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<RequirePasswordChanged />}>
              <Route
                path="/"
                element={
                  <>
                    <Header />
                    <Dashboard />
                  </>
                }
              />
              <Route
                path="/dataset/:datasetId"
                element={
                  <>
                    <Header />
                    <DatasetDetails />
                  </>
                }
              />
              <Route
                path="/statistics"
                element={
                  <>
                    <Header />
                    <Statistics />
                  </>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <>
                    <Header />
                    <AdminUsers />
                  </>
                }
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
