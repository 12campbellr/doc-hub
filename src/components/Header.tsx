import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import SearchBox from "@/components/SearchBox";

export default async function Header() {
  const user = await getCurrentUser();
  if (!user) return null;

  // While a password change is pending, every other route bounces back to
  // /change-password anyway (see src/middleware.ts) — skip the dead-end nav links.
  if (user.mustChangePassword) {
    return (
      <header className="sticky top-0 z-10 bg-navy-900 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/change-password" className="flex items-center gap-2 shrink-0">
            <Logo className="h-8 w-8 shrink-0" />
            <span className="text-lg font-semibold tracking-tight">
              DOC <span className="text-accent">Hub</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-slate-400 px-2">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 bg-navy-900 text-white shadow-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="text-lg font-semibold tracking-tight">
            DOC <span className="text-accent">Hub</span>
          </span>
        </Link>

        <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs">
          <Suspense fallback={null}>
            <SearchBox />
          </Suspense>
        </div>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
          >
            Library
          </Link>
          <Link
            href="/favorites"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
          >
            Favorites
          </Link>
          <Link
            href="/account"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
          >
            Account
          </Link>
          {user.role === "ADMIN" && (
            <>
              <Link
                href="/admin/users"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/groups"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
              >
                Groups
              </Link>
              <Link
                href="/admin/tags"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
              >
                Tags
              </Link>
              <Link
                href="/admin/activity"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
              >
                Activity
              </Link>
            </>
          )}
          <span className="hidden sm:inline text-sm text-slate-400 px-2">{user.name}</span>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
