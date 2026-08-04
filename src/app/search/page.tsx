import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { searchLibrary } from "@/lib/search";
import { getVisibleFolderIds } from "@/lib/permissions";
import { formatBytes, FILE_KIND_STYLES, type FileKind } from "@/lib/format";
import BreadcrumbPath from "@/components/BreadcrumbPath";
import FileTypeIcon from "@/components/FileTypeIcon";

const FILE_KINDS = Object.keys(FILE_KIND_STYLES) as FileKind[];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; tag?: string; folder?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { q, type, tag, folder, page } = await searchParams;
  const query = (q ?? "").trim();
  const typeFilter = FILE_KINDS.includes(type as FileKind) ? (type as FileKind) : undefined;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);

  if (!query) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        Type something in the search box above to find folders and documents.
      </p>
    );
  }

  const visibleFolderIds = await getVisibleFolderIds(user);

  const [allTags, allFolders] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.folder.findMany({
      where: visibleFolderIds ? { id: { in: Array.from(visibleFolderIds) } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  const folderPaths = (() => {
    const byId = new Map(allFolders.map((f) => [f.id, f]));
    function pathFor(id: string): string {
      const f = byId.get(id);
      if (!f) return "";
      return f.parentId ? `${pathFor(f.parentId)} / ${f.name}` : f.name;
    }
    return allFolders.map((f) => ({ id: f.id, path: pathFor(f.id) })).sort((a, b) => a.path.localeCompare(b.path));
  })();

  const { folders, files, filesTotalCount, pageSize } = await searchLibrary(query, {
    visibleFolderIds,
    type: typeFilter,
    tagId: tag || undefined,
    folderId: folder || undefined,
    page: pageNum,
  });
  const hasResults = folders.length > 0 || files.length > 0;
  const hasFilters = Boolean(typeFilter || tag || folder);
  const totalPages = Math.max(1, Math.ceil(filesTotalCount / pageSize));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams({ q: query });
    if (typeFilter) params.set("type", typeFilter);
    if (tag) params.set("tag", tag);
    if (folder) params.set("folder", folder);
    if (targetPage > 1) params.set("page", String(targetPage));
    return `/search?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">
        Search results for &ldquo;{query}&rdquo;
      </h1>

      <form method="get" action="/search" className="flex flex-wrap items-center gap-2 mb-4">
        <input type="hidden" name="q" value={query} />
        <select
          name="type"
          defaultValue={typeFilter ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {FILE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {FILE_KIND_STYLES[kind].label}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={tag ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          name="folder"
          defaultValue={folder ?? ""}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm max-w-[12rem]"
        >
          <option value="">Entire library</option>
          {folderPaths.map((f) => (
            <option key={f.id} value={f.id}>
              {f.path}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Apply
        </button>
        {hasFilters && (
          <Link href={`/search?q=${encodeURIComponent(query)}`} className="text-sm text-slate-500 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

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
          <h2 className="text-sm font-medium text-slate-600 mb-2">
            Documents
            {filesTotalCount > files.length && (
              <span className="font-normal text-slate-400"> ({filesTotalCount} total)</span>
            )}
          </h2>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3 text-sm">
              {pageNum > 1 ? (
                <Link href={pageHref(pageNum - 1)} className="text-accent-dark hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span className="text-slate-300">← Previous</span>
              )}
              <span className="text-slate-500">
                Page {pageNum} of {totalPages}
              </span>
              {pageNum < totalPages ? (
                <Link href={pageHref(pageNum + 1)} className="text-accent-dark hover:underline">
                  Next →
                </Link>
              ) : (
                <span className="text-slate-300">Next →</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
