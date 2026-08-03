import { prisma } from "@/lib/prisma";
import { getBreadcrumb, type Crumb } from "@/lib/folders";

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
  userId: string
): Promise<{ folders: FavoriteFolderItem[]; files: FavoriteFileItem[] }> {
  const favs = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      folder: true,
      file: { include: { uploadedBy: { select: { name: true } } } },
    },
  });

  const folders = await Promise.all(
    favs
      .filter((f) => f.folder)
      .map(async (f) => {
        const folder = f.folder!;
        const breadcrumb = await getBreadcrumb(folder.id);
        return { id: folder.id, name: folder.name, parentBreadcrumb: breadcrumb.slice(0, -1) };
      })
  );

  const files = await Promise.all(
    favs
      .filter((f) => f.file)
      .map(async (f) => {
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
