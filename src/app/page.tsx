import { getCurrentUser } from "@/lib/session";
import { getLibraryData } from "@/lib/get-library-data";
import LibraryView from "@/components/LibraryView";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null; // middleware redirects unauthenticated requests before this renders

  const data = await getLibraryData(null, user.id);
  if (!data) return null;

  return (
    <LibraryView
      currentFolderId={null}
      breadcrumb={data.breadcrumb}
      folders={data.folders}
      files={data.files}
      currentUser={user}
      favoriteFolderIds={data.favoriteFolderIds}
      favoriteFileIds={data.favoriteFileIds}
    />
  );
}
