import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { searchLibrary } from "@/lib/search";
import { formatBytes, getFileKind, FILE_KIND_STYLES } from "@/lib/format";
import type { Crumb } from "@/lib/folders";

function BreadcrumbPath({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <p className="text-xs text-slate-400 truncate">
      Home{crumbs.map((c) => ` / ${c.name}`).join("")}
    </p>
  );
}

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

  const { folders, files } = await searchLibrary(query);
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
              const kind = getFileKind(file.mimeType);
              const style = FILE_KIND_STYLES[kind];
              return (
                <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${style.className}`}
                  >
                    {style.label}
                  </span>
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
