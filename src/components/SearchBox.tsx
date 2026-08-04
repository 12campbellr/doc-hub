"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    // Clearing the box (typing it out, or the browser's native "x" button,
    // neither of which submits the form) should back out of search results.
    if (value === "" && pathname === "/search") {
      router.push("/");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/");
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
