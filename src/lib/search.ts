import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, getSubtreeFolderIds, type Crumb } from "@/lib/folders";
import type { FileKind } from "@/lib/format";

const FOLDER_RESULT_LIMIT = 20;
const FILE_PAGE_SIZE = 25;

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

export type SearchOptions = {
  /** null = no restriction filtering needed (admin, or nothing is restricted). */
  visibleFolderIds?: Set<string> | null;
  /** File-type facet, mirroring src/lib/format.ts's getFileKind() classification. */
  type?: FileKind;
  tagId?: string;
  /** Scopes file results to this folder's subtree (folder results are unaffected). */
  folderId?: string;
  /** 1-indexed. */
  page?: number;
};

/** Mirrors getFileKind()'s classification as a Prisma where-clause, since Prisma can't call it directly. */
function mimeTypeFilterFor(type: FileKind): Prisma.FileWhereInput {
  switch (type) {
    case "pdf":
      return { mimeType: "application/pdf" };
    case "image":
      return { mimeType: { startsWith: "image/" } };
    case "word":
      return { OR: [{ mimeType: { contains: "word" } }, { mimeType: { contains: "msword" } }] };
    case "excel":
      return { OR: [{ mimeType: { contains: "sheet" } }, { mimeType: { contains: "excel" } }] };
    case "other":
      return {
        AND: [
          { mimeType: { not: "application/pdf" } },
          { NOT: { mimeType: { startsWith: "image/" } } },
          { NOT: { mimeType: { contains: "word" } } },
          { NOT: { mimeType: { contains: "msword" } } },
          { NOT: { mimeType: { contains: "sheet" } } },
          { NOT: { mimeType: { contains: "excel" } } },
        ],
      };
  }
}

export async function searchLibrary(
  query: string,
  options: SearchOptions = {}
): Promise<{
  folders: FolderSearchResult[];
  files: FileSearchResult[];
  filesTotalCount: number;
  page: number;
  pageSize: number;
}> {
  const { visibleFolderIds, type, tagId, folderId, page = 1 } = options;

  const folderScopeIds = folderId ? await getSubtreeFolderIds(folderId) : null;

  const fileWhere: Prisma.FileWhereInput = {
    displayName: { contains: query, mode: "insensitive" },
    ...(visibleFolderIds
      ? { OR: [{ folderId: null }, { folderId: { in: Array.from(visibleFolderIds) } }] }
      : {}),
    ...(type ? mimeTypeFilterFor(type) : {}),
    ...(tagId ? { tags: { some: { id: tagId } } } : {}),
    ...(folderScopeIds ? { folderId: { in: folderScopeIds } } : {}),
  };

  const [matchedFolders, matchedFiles, filesTotalCount] = await Promise.all([
    // Folder results aren't paginated — matches are typically few, and folders have
    // no file-type/tag facets to narrow by, so a small cap is enough on its own.
    prisma.folder.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
        ...(visibleFolderIds ? { id: { in: Array.from(visibleFolderIds) } } : {}),
        ...(tagId ? { tags: { some: { id: tagId } } } : {}),
        ...(folderScopeIds ? { id: { in: folderScopeIds } } : {}),
      },
      orderBy: { name: "asc" },
      take: FOLDER_RESULT_LIMIT,
    }),
    prisma.file.findMany({
      where: fileWhere,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * FILE_PAGE_SIZE,
      take: FILE_PAGE_SIZE,
      include: { uploadedBy: { select: { name: true } } },
    }),
    prisma.file.count({ where: fileWhere }),
  ]);

  // Many results share ancestors (siblings in the same folder, or folders under the
  // same parent) — memoize within this call instead of re-walking parentId per result.
  const breadcrumbCache = new Map<string, Crumb[]>();
  async function cachedBreadcrumb(id: string | null): Promise<Crumb[]> {
    if (id === null) return [];
    const cached = breadcrumbCache.get(id);
    if (cached) return cached;
    const result = await getBreadcrumb(id);
    breadcrumbCache.set(id, result);
    return result;
  }

  const folders = await Promise.all(
    matchedFolders.map(async (f) => {
      const breadcrumb = await cachedBreadcrumb(f.id);
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
      folderBreadcrumb: await cachedBreadcrumb(f.folderId),
    }))
  );

  return { folders, files, filesTotalCount, page, pageSize: FILE_PAGE_SIZE };
}
