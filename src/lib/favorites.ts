import { prisma } from "@/lib/prisma";
import { getBreadcrumb, type Crumb } from "@/lib/folders";
import { canUserAccessFolder } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

export type FavoriteFolderItem = {
  id: string;
  name: string;
  parentBreadcrumb: Crumb[];
};

export type FavoriteFileItem = {
  id: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  uploadedByName: string;
  folderBreadcrumb: Crumb[];
};

export async function getFavorites(
  user: SessionUser
): Promise<{ folders: FavoriteFolderItem[]; files: FavoriteFileItem[] }> {
  const favs = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      folder: true,
      file: { include: { uploadedBy: { select: { name: true } } } },
    },
  });

  // Group-restricted favorites the user has since lost access to are silently
  // omitted (not deleted) — they reappear if access is restored later.
  const visibleFolderFavs = (
    await Promise.all(favs.filter((f) => f.folder).map(async (f) => ((await canUserAccessFolder(user, f.folder!.id)) ? f : null)))
  ).filter((f): f is NonNullable<typeof f> => f !== null);

  const visibleFileFavs = (
    await Promise.all(favs.filter((f) => f.file).map(async (f) => ((await canUserAccessFolder(user, f.file!.folderId)) ? f : null)))
  ).filter((f): f is NonNullable<typeof f> => f !== null);

  const folders = await Promise.all(
    visibleFolderFavs.map(async (f) => {
      const folder = f.folder!;
      const breadcrumb = await getBreadcrumb(folder.id);
      return { id: folder.id, name: folder.name, parentBreadcrumb: breadcrumb.slice(0, -1) };
    })
  );

  const files = await Promise.all(
    visibleFileFavs.map(async (f) => {
      const file = f.file!;
      return {
        id: file.id,
        displayName: file.displayName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        folderId: file.folderId,
        uploadedByName: file.uploadedBy?.name ?? "Removed user",
        folderBreadcrumb: await getBreadcrumb(file.folderId),
      };
    })
  );

  return { folders, files };
}
