import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";

export default async function Header() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-10 bg-navy-900 text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="text-lg font-semibold tracking-tight">
            DOC <span className="text-accent">Hub</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
          >
            Library
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin/users"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
            >
              Users
            </Link>
          )}
          <span className="hidden sm:inline text-sm text-slate-400 px-2">{user.name}</span>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
