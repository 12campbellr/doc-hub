"use client";

import { signOut } from "next-auth/react";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Set a New Password</h1>
      <p className="text-sm text-slate-500 mb-6">
        For security, you need to set your own password before continuing.
      </p>
      <ChangePasswordForm onSuccess={() => signOut({ callbackUrl: "/login" })} />
    </div>
  );
}
