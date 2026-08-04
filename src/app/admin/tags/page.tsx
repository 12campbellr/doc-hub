import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import AdminTagsView from "@/components/AdminTagsView";

export default async function AdminTagsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/");

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { folders: true, files: true } } },
  });

  return (
    <AdminTagsView
      initialTags={tags.map((t) => ({
        id: t.id,
        name: t.name,
        usageCount: t._count.folders + t._count.files,
      }))}
    />
  );
}
