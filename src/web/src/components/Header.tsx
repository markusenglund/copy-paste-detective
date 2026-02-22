import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

export function Header(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const linkClass = (path: string): string => {
    const baseClass =
      "px-3 py-2 rounded-md text-sm font-medium transition-colors";
    if (isActive(path)) {
      return `${baseClass} bg-blue-700 text-white`;
    }
    return `${baseClass} text-blue-100 hover:bg-blue-600 hover:text-white`;
  };

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-blue-800 shadow-md">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white mr-8">
              Science Detective
            </h1>
            <nav className="flex space-x-4">
              <Link to="/" className={linkClass("/")}>
                Dashboard
              </Link>
              <Link to="/statistics" className={linkClass("/statistics")}>
                Statistics
              </Link>
              {user?.role === "admin" && (
                <Link to="/admin/users" className={linkClass("/admin/users")}>
                  Users
                </Link>
              )}
            </nav>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-blue-100 text-sm">
                {user.username}{" "}
                <span className="text-blue-300 text-xs">({user.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-blue-100 hover:text-white text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
