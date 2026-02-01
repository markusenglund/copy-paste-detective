import React from "react";
import { Link, useLocation } from "react-router-dom";

export function Header(): React.ReactElement {
  const location = useLocation();

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
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
