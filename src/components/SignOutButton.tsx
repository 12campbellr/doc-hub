"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
    >
      Sign out
    </button>
  );
}
