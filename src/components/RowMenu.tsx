"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Overflow menu for less-frequent row actions (rename/move/restrict/delete). Folder
 * and file rows are tight on width on phones — this is the primary way the app is
 * used in the field — so only the most-tapped actions (favorite, tags) stay as
 * standalone icons; everything else collapses behind one "⋯" button.
 */
export default function RowMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      <button
        type="button"
        title="More actions"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        ⋯
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 z-30 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}
