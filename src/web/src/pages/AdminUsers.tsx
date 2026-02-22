import React, { useEffect, useState, useCallback } from "react";
import type { Role } from "../../../repositories/users/schema";

interface UserRow {
  id: number;
  username: string;
  role: Role;
  requiresPasswordChange: boolean;
  createdAt: string;
}

const ROLES: Role[] = ["admin", "editor", "viewer"];

export function AdminUsers(): React.ReactElement {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setTempPassword(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: newUsername, role: newRole }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create user");
      }

      const data = await res.json();
      setTempPassword(data.temporaryPassword);
      setNewUsername("");
      setNewRole("viewer");
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(userId: number): Promise<void> {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete user");
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleRoleChange(userId: number, role: Role): Promise<void> {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update role");
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleResetPassword(userId: number): Promise<void> {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reset password");
      }

      const data = await res.json();
      setTempPassword(data.temporaryPassword);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  if (isLoading) {
    return <p className="p-8 text-gray-500">Loading users...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setTempPassword(null);
          }}
          className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800"
        >
          {showCreateForm ? "Cancel" : "Create User"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-900 font-bold"
          >
            x
          </button>
        </div>
      )}

      {tempPassword && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded text-sm mb-4">
          <p className="font-semibold">Temporary password (shown once):</p>
          <code className="block mt-1 bg-yellow-100 px-2 py-1 rounded font-mono text-base select-all">
            {tempPassword}
          </code>
          <button
            onClick={() => setTempPassword(null)}
            className="mt-2 text-yellow-900 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="create-username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                id="create-username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="create-role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Role
              </label>
              <select
                id="create-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Username
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Role
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.username}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleRoleChange(u.id, e.target.value as Role)
                    }
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {u.requiresPasswordChange ? (
                    <span className="text-amber-600 text-xs font-medium">
                      Pending password change
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs font-medium">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleResetPassword(u.id)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Reset password
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-gray-500">No users found</p>
        )}
      </div>
    </div>
  );
}
