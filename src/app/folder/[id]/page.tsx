import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getLibraryData } from "@/lib/get-library-data";
import LibraryView from "@/components/LibraryView";

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const data = await getLibraryData(id, user.id);
  if (!data) notFound();

  return (
    <LibraryView
      currentFolderId={id}
      breadcrumb={data.breadcrumb}
      folders={data.folders}
      files={data.files}
      currentUser={user}
      favoriteFolderIds={data.favoriteFolderIds}
      favoriteFileIds={data.favoriteFileIds}
    />
  );
}
