"use client";

import { useEffect, useRef, useState } from "react";

export type TagOption = { id: string; name: string };

/**
 * Checkbox-list popover against the admin-managed tag vocabulary (no free text).
 * Purely a picker — the caller decides what `onChange` does (save via API, or just
 * update local filter state), so this is reusable for both applying tags to an item
 * and filtering by tag.
 */
export default function TagPicker({
  selectedIds,
  onChange,
  label = "Tags",
  disabled = false,
}: {
  selectedIds: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TagOption[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || options) return;
    fetch("/api/admin/tags")
      .then((res) => res.json())
      .then((body) => setOptions(body.tags ?? []))
      .catch(() => setOptions([]));
  }, [open, options]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        title={label}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      >
        🏷️
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          {options === null ? (
            <p className="text-xs text-slate-500 px-2 py-1">Loading…</p>
          ) : options.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 py-1">
              No tags yet. Create one from the Tags admin page.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {options.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(tag.id)}
                    onChange={() => toggle(tag.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-accent focus:ring-accent"
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
