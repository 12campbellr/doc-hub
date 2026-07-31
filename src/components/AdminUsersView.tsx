"use client";

import { useState, FormEvent } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TECHNICIAN";
  createdAt: string;
};

export default function AdminUsersView({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TECHNICIAN">("TECHNICIAN");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

      setUsers((prev) => [...prev, body.user]);
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
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{u.name}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                  u.role === "ADMIN" ? "bg-accent/10 text-accent-dark" : "bg-slate-100 text-slate-600"
                }`}
              >
                {u.role === "ADMIN" ? "Admin" : "Technician"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
