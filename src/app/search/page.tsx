import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { searchLibrary } from "@/lib/search";
import { getVisibleFolderIds } from "@/lib/permissions";
import { formatBytes } from "@/lib/format";
import BreadcrumbPath from "@/components/BreadcrumbPath";
import FileTypeIcon from "@/components/FileTypeIcon";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        Type something in the search box above to find folders and documents.
      </p>
    );
  }

  const visibleFolderIds = await getVisibleFolderIds(user);
  const { folders, files } = await searchLibrary(query, visibleFolderIds);
  const hasResults = folders.length > 0 || files.length > 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">
        Search results for &ldquo;{query}&rdquo;
      </h1>

      {!hasResults && (
        <p className="text-sm text-slate-500 py-8 text-center">No folders or documents matched.</p>
      )}

      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-600 mb-2">Folders</h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {folders.map((folder) => (
              <li key={folder.id}>
                <Link
                  href={`/folder/${folder.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="text-xl shrink-0" aria-hidden>
                    📁
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{folder.name}</p>
                    <BreadcrumbPath crumbs={folder.parentBreadcrumb} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-600 mb-2">Documents</h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {files.map((file) => {
              return (
                <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                  <FileTypeIcon fileId={file.id} mimeType={file.mimeType} />
                  <a
                    href={`/api/files/${file.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-0 hover:text-accent-dark"
                  >
                    <p className="font-medium text-slate-800 truncate">{file.displayName}</p>
                    <BreadcrumbPath crumbs={file.folderBreadcrumb} />
                  </a>
                  <span className="hidden sm:block shrink-0 text-xs text-slate-400 w-16 text-right">
                    {formatBytes(file.sizeBytes)}
                  </span>
                  <Link
                    href={file.folderId ? `/folder/${file.folderId}` : "/"}
                    className="shrink-0 text-xs text-accent-dark hover:underline"
                  >
                    View in folder
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
