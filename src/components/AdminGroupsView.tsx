"use client";

import { useState, FormEvent } from "react";

export type GroupRow = {
  id: string;
  name: string;
  createdAt: string;
  restrictedFolderCount: number;
  memberCount: number;
};

export default function AdminGroupsView({ initialGroups }: { initialGroups: GroupRow[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(g: GroupRow) {
    const warning =
      g.restrictedFolderCount > 0
        ? `Delete "${g.name}"? This removes the only restriction on ${g.restrictedFolderCount} folder(s), making them visible to everyone.`
        : `Delete "${g.name}"?`;
    if (!confirm(warning)) return;

    setError(null);
    setDeletingId(g.id);
    try {
      const res = await fetch(`/api/admin/groups/${g.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete group");
      setGroups((prev) => prev.filter((existing) => existing.id !== g.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create group");

      setGroups((prev) =>
        [...prev, { ...body.group, restrictedFolderCount: 0, memberCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Groups</h1>
        <p className="text-sm text-slate-500">
          Groups control who can see restricted folders. Assign users to a group from the Users page,
          then restrict a folder to one or more groups from its 🔒 icon in the library.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 max-w-md">
        <h2 className="font-medium text-slate-700">Add Group</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Contractors"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Group"}
        </button>
      </form>

      <div>
        <h2 className="font-medium text-slate-700 mb-2">All Groups ({groups.length})</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No groups yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{g.name}</p>
                  <p className="text-xs text-slate-500">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · restricts{" "}
                    {g.restrictedFolderCount} folder{g.restrictedFolderCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  title="Delete group"
                  onClick={() => handleDelete(g)}
                  disabled={deletingId === g.id}
                  className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
