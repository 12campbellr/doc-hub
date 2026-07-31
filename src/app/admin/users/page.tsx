import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import AdminUsersView from "@/components/AdminUsersView";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <AdminUsersView
      initialUsers={users.map((u) => ({
        ...u,
        role: u.role as "ADMIN" | "TECHNICIAN",
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
