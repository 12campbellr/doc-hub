import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

async function getUserGroupIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groups: { select: { id: true } } },
  });
  return user?.groups.map((g) => g.id) ?? [];
}

/**
 * Walks from `folderId` up to the root (mirrors the parentId walk in getBreadcrumb,
 * src/lib/folders.ts) and returns the nearest ancestor-or-self folder's restriction
 * group ids, or null if nothing in the chain is restricted.
 */
export async function getRestrictingGroupIds(folderId: string | null): Promise<string[] | null> {
  let currentId = folderId;
  while (currentId) {
    const folder = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true, restrictedByGroups: { select: { id: true } } },
    });
    if (!folder) return null;
    if (folder.restrictedByGroups.length > 0) {
      return folder.restrictedByGroups.map((g) => g.id);
    }
    currentId = folder.parentId;
  }
  return null;
}

/**
 * Single-resource visibility check. `folderId: null` means Home, which can never be
 * restricted (it isn't backed by a Folder row). Admins always pass.
 */
export async function canUserAccessFolder(user: SessionUser, folderId: string | null): Promise<boolean> {
  if (user.role === "ADMIN" || !folderId) return true;

  const restrictingGroupIds = await getRestrictingGroupIds(folderId);
  if (!restrictingGroupIds) return true;

  const userGroupIds = await getUserGroupIds(user.id);
  return restrictingGroupIds.some((id) => userGroupIds.includes(id));
}

/**
 * Bulk visibility check for list/search endpoints. Returns null as a "no filtering
 * needed" fast path (admin, or zero folders are restricted system-wide — day-one
 * installs pay zero extra query cost). Otherwise resolves every folder's effective
 * (possibly inherited) restriction in a single pass and returns the set of folder ids
 * visible to `user`.
 */
export async function getVisibleFolderIds(user: SessionUser): Promise<Set<string> | null> {
  if (user.role === "ADMIN") return null;

  const allFolders = await prisma.folder.findMany({
    select: { id: true, parentId: true, restrictedByGroups: { select: { id: true } } },
  });
  if (!allFolders.some((f) => f.restrictedByGroups.length > 0)) return null;

  const userGroupIds = new Set(await getUserGroupIds(user.id));
  const byId = new Map(allFolders.map((f) => [f.id, f]));
  const restrictionCache = new Map<string, string[] | null>();

  function resolveRestriction(id: string): string[] | null {
    const cached = restrictionCache.get(id);
    if (cached !== undefined) return cached;

    const folder = byId.get(id);
    let result: string[] | null = null;
    if (folder) {
      if (folder.restrictedByGroups.length > 0) {
        result = folder.restrictedByGroups.map((g) => g.id);
      } else if (folder.parentId) {
        result = resolveRestriction(folder.parentId);
      }
    }
    restrictionCache.set(id, result);
    return result;
  }

  const visible = new Set<string>();
  for (const folder of allFolders) {
    const restriction = resolveRestriction(folder.id);
    if (!restriction || restriction.some((id) => userGroupIds.has(id))) {
      visible.add(folder.id);
    }
  }
  return visible;
}
