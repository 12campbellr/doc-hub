import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import AdminUsersView from "@/components/AdminUsersView";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/");

  const [users, groups] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        groups: { select: { id: true } },
      },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AdminUsersView
      currentUserId={user.id}
      availableGroups={groups}
      initialUsers={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as "ADMIN" | "TECHNICIAN",
        createdAt: u.createdAt.toISOString(),
        groupIds: u.groups.map((g) => g.id),
      }))}
    />
  );
}
