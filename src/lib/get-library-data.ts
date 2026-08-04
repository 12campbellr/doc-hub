import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/folders";
import { canUserAccessFolder } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type { FileSummary, FolderSummary } from "@/lib/types";

export async function getLibraryData(folderId: string | null, user: SessionUser) {
  const [folder, breadcrumb, allChildFolders, files] = await Promise.all([
    folderId ? prisma.folder.findUnique({ where: { id: folderId } }) : Promise.resolve(null),
    getBreadcrumb(folderId),
    prisma.folder.findMany({
      where: { parentId: folderId },
      orderBy: { name: "asc" },
      include: { restrictedByGroups: { select: { id: true } } },
    }),
    prisma.file.findMany({
      where: { folderId },
      orderBy: { displayName: "asc" },
      include: { uploadedBy: { select: { name: true } } },
    }),
  ]);

  // Same "not found" shape for a nonexistent folder and one the caller can't see —
  // a distinguishable response would leak the restricted folder's existence.
  if (folderId && (!folder || !(await canUserAccessFolder(user, folderId)))) {
    return null;
  }

  // Subfolders can carry a stricter restriction than the folder being viewed, so each
  // is checked individually rather than inheriting the parent's already-established access.
  const folders =
    user.role === "ADMIN"
      ? allChildFolders
      : (
          await Promise.all(
            allChildFolders.map(async (f) => ((await canUserAccessFolder(user, f.id)) ? f : null))
          )
        ).filter((f): f is NonNullable<typeof f> => f !== null);

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
      OR: [
        { folderId: { in: folders.map((f) => f.id) } },
        { fileId: { in: files.map((f) => f.id) } },
      ],
    },
    select: { folderId: true, fileId: true },
  });
  const favoriteFolderIds = favorites.filter((f) => f.folderId).map((f) => f.folderId as string);
  const favoriteFileIds = favorites.filter((f) => f.fileId).map((f) => f.fileId as string);

  const folderSummaries: FolderSummary[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    createdById: f.createdById,
    restrictedGroupIds: f.restrictedByGroups.map((g) => g.id),
  }));

  const fileSummaries: FileSummary[] = files.map((f) => ({
    id: f.id,
    displayName: f.displayName,
    originalFilename: f.originalFilename,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
    uploadedById: f.uploadedById,
    uploadedByName: f.uploadedBy?.name ?? "Removed user",
  }));

  return {
    breadcrumb,
    folders: folderSummaries,
    files: fileSummaries,
    favoriteFolderIds,
    favoriteFileIds,
  };
}
