import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export function RequireAuth(): React.ReactElement {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
