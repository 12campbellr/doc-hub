import { getCurrentUser } from "@/lib/session";
import { getFavorites } from "@/lib/favorites";
import FavoritesView from "@/components/FavoritesView";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { folders, files } = await getFavorites(user.id);

  return <FavoritesView initialFolders={folders} initialFiles={files} />;
}
