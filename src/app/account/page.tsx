import { getCurrentUser } from "@/lib/session";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">My Account</h1>
      <p className="text-sm text-slate-500 mb-6">
        Signed in as {user.name} ({user.email})
      </p>

      <ChangePasswordForm />
    </div>
  );
}
