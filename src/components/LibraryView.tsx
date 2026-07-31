"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Crumb, CurrentUser, FileSummary, FolderSummary } from "@/lib/types";
import { formatBytes, getFileKind, FILE_KIND_STYLES } from "@/lib/format";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

function canManage(currentUser: CurrentUser, ownerId: string) {
  return currentUser.role === "ADMIN" || currentUser.id === ownerId;
}

type MoveTarget = { type: "folder" | "file"; id: string; name: string } | null;

export default function LibraryView({
  currentFolderId,
  breadcrumb,
  folders,
  files,
  currentUser,
}: {
  currentFolderId: string | null;
  breadcrumb: Crumb[];
  folders: FolderSummary[];
  files: FileSummary[];
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [editing, setEditing] = useState<{ type: "folder" | "file"; id: string; value: string } | null>(
    null
  );

  const [moveTarget, setMoveTarget] = useState<MoveTarget>(null);
  const [allFolders, setAllFolders] = useState<{ id: string; name: string; parentId: string | null }[] | null>(
    null
  );
  const [moveDestination, setMoveDestination] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    router.refresh();
  }

  async function withBusy(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    await withBusy(async () => {
      await apiFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      });
      setNewFolderName("");
      setCreatingFolder(false);
      refresh();
    });
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const total = fileList.length;
      for (let i = 0; i < total; i++) {
        setUploadStatus(`Uploading ${i + 1} of ${total}…`);
        const form = new FormData();
        form.append("file", fileList[i]);
        if (currentFolderId) form.append("folderId", currentFolderId);
        await apiFetch("/api/files", { method: "POST", body: form });
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function startEditing(type: "folder" | "file", id: string, currentName: string) {
    setEditing({ type, id, value: currentName });
  }

  async function saveEditing() {
    if (!editing) return;
    const value = editing.value.trim();
    if (!value) {
      setEditing(null);
      return;
    }
    await withBusy(async () => {
      if (editing.type === "folder") {
        await apiFetch(`/api/folders/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: value }),
        });
      } else {
        await apiFetch(`/api/files/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: value }),
        });
      }
      setEditing(null);
      refresh();
    });
  }

  async function handleDeleteFolder(folder: FolderSummary) {
    if (!confirm(`Delete "${folder.name}" and everything inside it? This can't be undone.`)) return;
    await withBusy(async () => {
      await apiFetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      refresh();
    });
  }

  async function handleDeleteFile(file: FileSummary) {
    if (!confirm(`Delete "${file.displayName}"? This can't be undone.`)) return;
    await withBusy(async () => {
      await apiFetch(`/api/files/${file.id}`, { method: "DELETE" });
      refresh();
    });
  }

  async function openMoveModal(type: "folder" | "file", id: string, name: string) {
    setMoveTarget({ type, id, name });
    setMoveDestination("");
    if (!allFolders) {
      const data = await apiFetch("/api/folders");
      setAllFolders(data.folders);
    }
  }

  const folderPaths = useMemo(() => {
    if (!allFolders) return [];
    const byId = new Map(allFolders.map((f) => [f.id, f]));
    function pathFor(id: string): string {
      const f = byId.get(id);
      if (!f) return "";
      return f.parentId ? `${pathFor(f.parentId)} / ${f.name}` : f.name;
    }
    return allFolders
      .filter((f) => (moveTarget?.type === "folder" ? f.id !== moveTarget.id : true))
      .map((f) => ({ id: f.id, path: pathFor(f.id) }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [allFolders, moveTarget]);

  async function confirmMove() {
    if (!moveTarget) return;
    const destination = moveDestination || null;
    await withBusy(async () => {
      if (moveTarget.type === "folder") {
        await apiFetch(`/api/folders/${moveTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: destination }),
        });
      } else {
        await apiFetch(`/api/files/${moveTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: destination }),
        });
      }
      setMoveTarget(null);
      refresh();
    });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500 mb-4">
        <Link href="/" className="hover:text-accent-dark font-medium">
          Home
        </Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span className="text-slate-300">/</span>
            <Link href={`/folder/${crumb.id}`} className="hover:text-accent-dark font-medium">
              {crumb.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setCreatingFolder((v) => !v)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          + New Folder
        </button>

        <label className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark cursor-pointer transition-colors">
          Upload Files
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>

        <label className="rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent-dark hover:bg-accent/10 cursor-pointer transition-colors">
          Take Photo
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>

        {uploadStatus && <span className="text-sm text-slate-500">{uploadStatus}</span>}
      </div>

      {creatingFolder && (
        <div className="flex items-center gap-2 mb-4 bg-white border border-slate-200 rounded-md p-3">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            placeholder="Folder name"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleCreateFolder}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Create
          </button>
          <button
            onClick={() => {
              setCreatingFolder(false);
              setNewFolderName("");
            }}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <ul className="mb-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl shrink-0" aria-hidden>
                📁
              </span>
              {editing?.type === "folder" && editing.id === folder.id ? (
                <input
                  autoFocus
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                  onBlur={saveEditing}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              ) : (
                <Link href={`/folder/${folder.id}`} className="flex-1 font-medium text-slate-800 hover:text-accent-dark">
                  {folder.name}
                </Link>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title="Rename"
                  onClick={() => startEditing("folder", folder.id, folder.name)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✏️
                </button>
                <button
                  title="Move"
                  onClick={() => openMoveModal("folder", folder.id, folder.name)}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  📦
                </button>
                {canManage(currentUser, folder.createdById) && (
                  <button
                    title="Delete"
                    onClick={() => handleDeleteFolder(folder)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Files */}
      {files.length > 0 ? (
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

                {editing?.type === "file" && editing.id === file.id ? (
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                    onBlur={saveEditing}
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                ) : (
                  <a
                    href={`/api/files/${file.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-0 truncate font-medium text-slate-800 hover:text-accent-dark"
                  >
                    {file.displayName}
                  </a>
                )}

                <span className="hidden sm:block shrink-0 text-xs text-slate-400 w-16 text-right">
                  {formatBytes(file.sizeBytes)}
                </span>
                <span className="hidden md:block shrink-0 text-xs text-slate-400 w-28 truncate">
                  {file.uploadedByName}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title="Rename"
                    onClick={() => startEditing("file", file.id, file.displayName)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✏️
                  </button>
                  <button
                    title="Move"
                    onClick={() => openMoveModal("file", file.id, file.displayName)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    📦
                  </button>
                  <a
                    title="Download"
                    href={`/api/files/${file.id}/download?download=1`}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    ⬇️
                  </a>
                  {canManage(currentUser, file.uploadedById) && (
                    <button
                      title="Delete"
                      onClick={() => handleDeleteFile(file)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        folders.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">
            This folder is empty. Create a subfolder or upload the first file.
          </p>
        )
      )}

      {/* Move modal */}
      {moveTarget && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Move "{moveTarget.name}"</h2>
            <p className="text-sm text-slate-500 mb-3">Choose a destination folder.</p>
            <select
              value={moveDestination}
              onChange={(e) => setMoveDestination(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm mb-4"
            >
              <option value="">Home (root)</option>
              {folderPaths.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.path}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMoveTarget(null)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmMove}
                disabled={busy}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
