"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search folders and documents…"
        aria-label="Search folders and documents"
        className="w-full rounded-md border border-navy-600 bg-navy-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </form>
  );
}
