"use client";

import { useState, FormEvent } from "react";

export type TagRow = {
  id: string;
  name: string;
  usageCount: number;
};

export default function AdminTagsView({ initialTags }: { initialTags: TagRow[] }) {
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(t: TagRow) {
    const warning =
      t.usageCount > 0
        ? `Delete "${t.name}"? It will be removed from ${t.usageCount} folder(s)/file(s).`
        : `Delete "${t.name}"?`;
    if (!confirm(warning)) return;

    setError(null);
    setDeletingId(t.id);
    try {
      const res = await fetch(`/api/admin/tags/${t.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete tag");
      setTags((prev) => prev.filter((existing) => existing.id !== t.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create tag");

      setTags((prev) =>
        [...prev, { ...body.tag, usageCount: 0 }].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Tags</h1>
        <p className="text-sm text-slate-500">
          Tags let you categorize folders and documents (e.g. by equipment model or region). Admins and
          folder/file owners can apply tags from this list in the library.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 max-w-md">
        <h2 className="font-medium text-slate-700">Add Tag</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Generator-X500"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create Tag"}
        </button>
      </form>

      <div>
        <h2 className="font-medium text-slate-700 mb-2">All Tags ({tags.length})</h2>
        {tags.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No tags yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {tags.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    used on {t.usageCount} item{t.usageCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  title="Delete tag"
                  onClick={() => handleDelete(t)}
                  disabled={deletingId === t.id}
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
