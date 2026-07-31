import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/folders";
import type { FileSummary, FolderSummary } from "@/lib/types";

export async function getLibraryData(folderId: string | null) {
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
    uploadedByName: f.uploadedBy.name,
  }));

  return { breadcrumb, folders: folderSummaries, files: fileSummaries };
}
