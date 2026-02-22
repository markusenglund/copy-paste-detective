import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export function RequirePasswordChanged(): React.ReactElement {
  const { user } = useAuth();

  if (user?.requiresPasswordChange) {
    return <Navigate to="/reset-password" replace />;
  }

  return <Outlet />;
}
