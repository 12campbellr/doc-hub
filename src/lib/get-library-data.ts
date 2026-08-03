import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/folders";
import type { FileSummary, FolderSummary } from "@/lib/types";

export async function getLibraryData(folderId: string | null, userId: string) {
  const [folder, breadcrumb, folders, files] = await Promise.all([
    folderId ? prisma.folder.findUnique({ where: { id: folderId } }) : Promise.resolve(null),
    getBreadcrumb(folderId),
    prisma.folder.findMany({
      where: { parentId: folderId },
      orderBy: { name: "asc" },
    }),
    prisma.file.findMany({
      where: { folderId },
      orderBy: { displayName: "asc" },
      include: { uploadedBy: { select: { name: true } } },
    }),
  ]);

  if (folderId && !folder) {
    return null;
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
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
