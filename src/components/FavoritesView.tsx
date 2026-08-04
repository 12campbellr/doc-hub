"use client";

import { useState } from "react";
import Link from "next/link";
import BreadcrumbPath from "@/components/BreadcrumbPath";
import FileTypeIcon from "@/components/FileTypeIcon";
import { formatBytes } from "@/lib/format";
import type { FavoriteFolderItem, FavoriteFileItem } from "@/lib/favorites";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export default function FavoritesView({
  initialFolders,
  initialFiles,
}: {
  initialFolders: FavoriteFolderItem[];
  initialFiles: FavoriteFileItem[];
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [files, setFiles] = useState(initialFiles);
  const [error, setError] = useState<string | null>(null);

  async function removeFavorite(type: "folder" | "file", id: string) {
    const prevFolders = folders;
    const prevFiles = files;
    if (type === "folder") setFolders((prev) => prev.filter((f) => f.id !== id));
    else setFiles((prev) => prev.filter((f) => f.id !== id));

    try {
      await apiFetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: type === "folder" ? "FOLDER" : "FILE", targetId: id }),
      });
    } catch (err) {
      setFolders(prevFolders);
      setFiles(prevFiles);
      setError(err instanceof Error ? err.message : "Couldn't remove favorite");
    }
  }

  const hasResults = folders.length > 0 || files.length > 0;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Favorites</h1>
      <p className="text-sm text-slate-500 mb-4">
        Folders and documents you've starred for quick access.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!hasResults && (
        <p className="text-sm text-slate-500 py-8 text-center">
          Nothing starred yet — click the ☆ next to any folder or document to add it here.
        </p>
      )}

      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-600 mb-2">Folders</h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {folders.map((folder) => (
              <li key={folder.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  title="Remove from favorites"
                  onClick={() => removeFavorite("folder", folder.id)}
                  className="shrink-0 rounded p-1 text-amber-400 hover:bg-slate-100"
                >
                  ⭐
                </button>
                <Link href={`/folder/${folder.id}`} className="flex-1 min-w-0 hover:text-accent-dark">
                  <p className="font-medium text-slate-800 truncate">{folder.name}</p>
                  <BreadcrumbPath crumbs={folder.parentBreadcrumb} />
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
                  <button
                    title="Remove from favorites"
                    onClick={() => removeFavorite("file", file.id)}
                    className="shrink-0 rounded p-1 text-amber-400 hover:bg-slate-100"
                  >
                    ⭐
                  </button>
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
