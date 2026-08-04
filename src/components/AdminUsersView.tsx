"use client";

import { useState, FormEvent } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TECHNICIAN";
  createdAt: string;
  groupIds: string[];
};

export default function AdminUsersView({
  initialUsers,
  currentUserId,
  availableGroups,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
  availableGroups: { id: string; name: string }[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TECHNICIAN">("TECHNICIAN");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  async function handleUpdate(u: UserRow, patch: { role?: "ADMIN" | "TECHNICIAN"; groupIds?: string[] }) {
    setError(null);
    setSavingId(u.id);
    const previous = users;
    // Optimistic update — reverted below if the request fails.
    setUsers((prev) => prev.map((existing) => (existing.id === u.id ? { ...existing, ...patch } : existing)));
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to update account");
      setUsers((prev) => prev.map((existing) => (existing.id === u.id ? { ...existing, ...body.user } : existing)));
    } catch (err) {
      setUsers(previous);
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`Delete the account for ${u.name} (${u.email})? This can't be undone.`)) return;
    setError(null);
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete account");
      setUsers((prev) => prev.filter((existing) => existing.id !== u.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create account");

      setUsers((prev) => [...prev, { ...body.user, groupIds: [] }]);
      setSuccess(`Account created for ${body.user.name}. Share the temporary password with them directly.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("TECHNICIAN");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Technician Accounts</h1>
        <p className="text-sm text-slate-500">Create and manage logins for field technicians.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 max-w-md">
        <h2 className="font-medium text-slate-700">Add Technician</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Temporary password</label>
          <input
            required
            type="text"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "TECHNICIAN")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="TECHNICIAN">Technician</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-accent-dark">{success}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Account"}
        </button>
      </form>

      <div>
        <h2 className="font-medium text-slate-700 mb-2">All Accounts ({users.length})</h2>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const isLastAdmin = u.role === "ADMIN" && adminCount <= 1;
            return (
              <li key={u.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => handleUpdate(u, { role: e.target.value as "ADMIN" | "TECHNICIAN" })}
                    disabled={isLastAdmin || savingId === u.id}
                    title={isLastAdmin ? "Can't demote the last admin" : undefined}
                    className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                  >
                    <option value="TECHNICIAN">Technician</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {!isSelf && !isLastAdmin && (
                    <button
                      title="Delete account"
                      onClick={() => handleDelete(u)}
                      disabled={deletingId === u.id}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                {availableGroups.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-0">
                    {availableGroups.map((g) => {
                      const checked = u.groupIds.includes(g.id);
                      return (
                        <label key={g.id} className="flex items-center gap-1 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={savingId === u.id}
                            onChange={() => {
                              const groupIds = checked
                                ? u.groupIds.filter((id) => id !== g.id)
                                : [...u.groupIds, g.id];
                              handleUpdate(u, { groupIds });
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-accent focus:ring-accent"
                          />
                          {g.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
