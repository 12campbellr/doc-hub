"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/** Where "clear the search box" should return to — wherever search was launched from. */
function getReturnPath(pathname: string, searchParams: URLSearchParams): string {
  if (pathname !== "/search") return pathname;
  const from = searchParams.get("from");
  return from && from.startsWith("/") && from !== "/search" ? from : "/";
}

export default function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    // Clearing the box (typing it out, or the browser's native "x" button,
    // neither of which submits the form) should back out of search results —
    // to whichever page search was launched from, not always the library.
    if (value === "" && pathname === "/search") {
      router.push(getReturnPath(pathname, searchParams));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push(getReturnPath(pathname, searchParams));
      return;
    }
    const from = getReturnPath(pathname, searchParams);
    router.push(`/search?q=${encodeURIComponent(q)}&from=${encodeURIComponent(from)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder="Search folders and documents…"
        aria-label="Search folders and documents"
        className="w-full rounded-md border border-navy-600 bg-navy-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </form>
  );
}
