import { prisma } from "@/lib/prisma";
import { getBreadcrumb, type Crumb } from "@/lib/folders";

const RESULT_LIMIT = 50;

export type FolderSearchResult = {
  id: string;
  name: string;
  /** Ancestor path, root-first, NOT including this folder itself. */
  parentBreadcrumb: Crumb[];
};

export type FileSearchResult = {
  id: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  uploadedByName: string;
  /** Path of the containing folder, root-first, including that folder itself. */
  folderBreadcrumb: Crumb[];
};

export async function searchLibrary(
  query: string
): Promise<{ folders: FolderSearchResult[]; files: FileSearchResult[] }> {
  const [matchedFolders, matchedFiles] = await Promise.all([
    prisma.folder.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    }),
    prisma.file.findMany({
      where: { displayName: { contains: query, mode: "insensitive" } },
      orderBy: { displayName: "asc" },
      take: RESULT_LIMIT,
      include: { uploadedBy: { select: { name: true } } },
    }),
  ]);

  const folders = await Promise.all(
    matchedFolders.map(async (f) => {
      const breadcrumb = await getBreadcrumb(f.id);
      return { id: f.id, name: f.name, parentBreadcrumb: breadcrumb.slice(0, -1) };
    })
  );

  const files = await Promise.all(
    matchedFiles.map(async (f) => ({
      id: f.id,
      displayName: f.displayName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      folderId: f.folderId,
      uploadedByName: f.uploadedBy?.name ?? "Removed user",
      folderBreadcrumb: await getBreadcrumb(f.folderId),
    }))
  );

  return { folders, files };
}
