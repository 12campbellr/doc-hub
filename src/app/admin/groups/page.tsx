import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import AdminGroupsView from "@/components/AdminGroupsView";

export default async function AdminGroupsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/");

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { restrictedFolders: true, members: true } },
    },
  });

  return (
    <AdminGroupsView
      initialGroups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        createdAt: g.createdAt.toISOString(),
        restrictedFolderCount: g._count.restrictedFolders,
        memberCount: g._count.members,
      }))}
    />
  );
}
