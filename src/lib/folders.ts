import { prisma } from "@/lib/prisma";

export type Crumb = { id: string; name: string };

/** Walks parentId links from a folder up to the root, returning root-first order. */
export async function getBreadcrumb(folderId: string | null): Promise<Crumb[]> {
  const crumbs: Crumb[] = [];
  let currentId = folderId;

  while (currentId) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return crumbs;
}

/** Returns this folder's id plus every descendant folder id (breadth-first). */
export async function getSubtreeFolderIds(folderId: string): Promise<string[]> {
  const ids = [folderId];
  let frontier = [folderId];

  while (frontier.length > 0) {
    const children = await prisma.folder.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }

  return ids;
}

/** Prevents moving a folder into itself or one of its own descendants. */
export async function isDescendantOf(candidateParentId: string, folderId: string): Promise<boolean> {
  let currentId: string | null = candidateParentId;
  while (currentId) {
    if (currentId === folderId) return true;
    const folder: { parentId: string | null } | null = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = folder?.parentId ?? null;
  }
  return false;
}
