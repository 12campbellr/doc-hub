"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Crumb, CurrentUser, FileSummary, FolderSummary } from "@/lib/types";
import { formatBytes, getFileKind } from "@/lib/format";
import FileTypeIcon from "@/components/FileTypeIcon";
import TagPicker from "@/components/TagPicker";
import RowMenu from "@/components/RowMenu";

const menuItemClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

function canManage(currentUser: CurrentUser, ownerId: string | null) {
  return currentUser.role === "ADMIN" || currentUser.id === ownerId;
}

type ItemRef = { type: "folder" | "file"; id: string; name: string };

export default function LibraryView({
  currentFolderId,
  breadcrumb,
  folders,
  files,
  currentUser,
  favoriteFolderIds,
  favoriteFileIds,
}: {
  currentFolderId: string | null;
  breadcrumb: Crumb[];
  folders: FolderSummary[];
  files: FileSummary[];
  currentUser: CurrentUser;
  favoriteFolderIds: string[];
  favoriteFileIds: string[];
}) {
  const router = useRouter();
  const isAdmin = currentUser.role === "ADMIN";
  const [favFolders, setFavFolders] = useState<Set<string>>(new Set(favoriteFolderIds));
  const [favFiles, setFavFiles] = useState<Set<string>>(new Set(favoriteFileIds));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [editing, setEditing] = useState<{ type: "folder" | "file"; id: string; value: string } | null>(
    null
  );

  const [moveTargets, setMoveTargets] = useState<ItemRef[] | null>(null);
  const [allFolders, setAllFolders] = useState<{ id: string; name: string; parentId: string | null }[] | null>(
    null
  );
  const [moveDestination, setMoveDestination] = useState<string>("");

  const [previewFile, setPreviewFile] = useState<FileSummary | null>(null);

  const [restrictingFolder, setRestrictingFolder] = useState<FolderSummary | null>(null);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[] | null>(null);
  const [restrictionGroupIds, setRestrictionGroupIds] = useState<Set<string>>(new Set());

  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const selectedCount = selectedFolders.size + selectedFiles.size;

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

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

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    // Required for onDrop to fire at all.
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
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

  async function handleTagsChange(type: "folder" | "file", id: string, tagIds: string[]) {
    await withBusy(async () => {
      const url = type === "folder" ? `/api/folders/${id}` : `/api/files/${id}`;
      await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });
      refresh();
    });
  }

  function toggleSelected(type: "folder" | "file", id: string) {
    const set = type === "folder" ? selectedFolders : selectedFiles;
    const setter = type === "folder" ? setSelectedFolders : setSelectedFiles;
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function clearSelection() {
    setSelectedFolders(new Set());
    setSelectedFiles(new Set());
  }

  async function toggleFavorite(type: "folder" | "file", id: string) {
    const set = type === "folder" ? favFolders : favFiles;
    const setter = type === "folder" ? setFavFolders : setFavFiles;
    const wasFavorited = set.has(id);

    // Optimistic update — favoriting should feel instant, not wait on a round trip.
    const next = new Set(set);
    if (wasFavorited) next.delete(id);
    else next.add(id);
    setter(next);

    try {
      await apiFetch("/api/favorites", {
        method: wasFavorited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: type === "folder" ? "FOLDER" : "FILE", targetId: id }),
      });
    } catch (err) {
      // Revert on failure.
      const reverted = new Set(set);
      setter(reverted);
      setError(err instanceof Error ? err.message : "Couldn't update favorite");
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedCount} selected item(s)? This can't be undone.`)) return;
    await withBusy(async () => {
      // Files first: if a selected folder is deleted first it cascades its own
      // files, which would make a separately-selected file 404 unnecessarily.
      const results = await Promise.allSettled([
        ...Array.from(selectedFiles).map((id) => apiFetch(`/api/files/${id}`, { method: "DELETE" })),
        ...Array.from(selectedFolders).map((id) => apiFetch(`/api/folders/${id}`, { method: "DELETE" })),
      ]);
      const failed = results.filter((r) => r.status === "rejected").length;
      clearSelection();
      refresh();
      if (failed > 0) {
        throw new Error(`${failed} of ${selectedCount} item(s) couldn't be deleted`);
      }
    });
  }

  async function handleBulkDownload() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/files/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          folderIds: Array.from(selectedFolders),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Download failed (${res.status})`);
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? decodeURIComponent(match[1]) : "dochub-download.zip";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function openRestrictionModal(folder: FolderSummary) {
    setRestrictingFolder(folder);
    setRestrictionGroupIds(new Set(folder.restrictedGroupIds));
    if (!allGroups) {
      const data = await apiFetch("/api/admin/groups");
      setAllGroups(data.groups);
    }
  }

  function toggleRestrictionGroup(groupId: string) {
    setRestrictionGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function confirmRestriction() {
    if (!restrictingFolder) return;
    await withBusy(async () => {
      await apiFetch(`/api/folders/${restrictingFolder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: Array.from(restrictionGroupIds) }),
      });
      setRestrictingFolder(null);
      refresh();
    });
  }

  async function openMoveModal(targets: ItemRef[]) {
    setMoveTargets(targets);
    setMoveDestination("");
    if (!allFolders) {
      const data = await apiFetch("/api/folders");
      setAllFolders(data.folders);
    }
  }

  const folderPaths = useMemo(() => {
    if (!allFolders) return [];
    const byId = new Map(allFolders.map((f) => [f.id, f]));
    const excludedFolderIds = new Set(
      (moveTargets ?? []).filter((t) => t.type === "folder").map((t) => t.id)
    );
    function pathFor(id: string): string {
      const f = byId.get(id);
      if (!f) return "";
      return f.parentId ? `${pathFor(f.parentId)} / ${f.name}` : f.name;
    }
    return allFolders
      .filter((f) => !excludedFolderIds.has(f.id))
      .map((f) => ({ id: f.id, path: pathFor(f.id) }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [allFolders, moveTargets]);

  async function confirmMove() {
    if (!moveTargets || moveTargets.length === 0) return;
    const destination = moveDestination || null;
    await withBusy(async () => {
      const results = await Promise.allSettled(
        moveTargets.map((target) =>
          target.type === "folder"
            ? apiFetch(`/api/folders/${target.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parentId: destination }),
              })
            : apiFetch(`/api/files/${target.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderId: destination }),
              })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setMoveTargets(null);
      clearSelection();
      refresh();
      if (failed > 0) {
        throw new Error(`${failed} of ${moveTargets.length} item(s) couldn't be moved`);
      }
    });
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-navy-950/40">
          <div className="rounded-xl border-4 border-dashed border-accent bg-white px-8 py-6 text-center shadow-xl">
            <p className="text-lg font-semibold text-slate-800">Drop to upload</p>
            <p className="text-sm text-slate-500">
              {currentFolderId ? "Files will be added to this folder" : "Files will be added to Home"}
            </p>
          </div>
        </div>
      )}

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

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-accent/10 border border-accent/30 rounded-md p-3">
          <span className="text-sm font-medium text-navy-900">{selectedCount} selected</span>
          <button
            onClick={handleBulkDownload}
            disabled={busy}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Download as ZIP
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                const targets: ItemRef[] = [
                  ...folders
                    .filter((f) => selectedFolders.has(f.id))
                    .map((f) => ({ type: "folder" as const, id: f.id, name: f.name })),
                  ...files
                    .filter((f) => selectedFiles.has(f.id))
                    .map((f) => ({ type: "file" as const, id: f.id, name: f.displayName })),
                ];
                openMoveModal(targets);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Move
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleBulkDelete}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={clearSelection}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Clear selection
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
              <input
                type="checkbox"
                checked={selectedFolders.has(folder.id)}
                onChange={() => toggleSelected("folder", folder.id)}
                className="shrink-0 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                aria-label={`Select ${folder.name}`}
              />
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
                <Link href={`/folder/${folder.id}`} className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 font-medium text-slate-800 hover:text-accent-dark">
                  <span className="truncate">{folder.name}</span>
                  {folder.restrictedGroupIds.length > 0 && (
                    <span title="Restricted to specific groups" aria-hidden className="shrink-0 text-sm">
                      🔒
                    </span>
                  )}
                  {folder.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-600"
                    >
                      {tag.name}
                    </span>
                  ))}
                </Link>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title={favFolders.has(folder.id) ? "Remove from favorites" : "Add to favorites"}
                  onClick={() => toggleFavorite("folder", folder.id)}
                  className="rounded p-1.5 text-amber-400 hover:bg-slate-100"
                >
                  {favFolders.has(folder.id) ? "⭐" : "☆"}
                </button>
                {canManage(currentUser, folder.createdById) && (
                  <TagPicker
                    label="Tags"
                    selectedIds={folder.tags.map((t) => t.id)}
                    onChange={(tagIds) => handleTagsChange("folder", folder.id, tagIds)}
                    disabled={busy}
                  />
                )}
                <RowMenu>
                  <button onClick={() => startEditing("folder", folder.id, folder.name)} className={menuItemClass}>
                    ✏️ Rename
                  </button>
                  <button
                    onClick={() => openMoveModal([{ type: "folder", id: folder.id, name: folder.name }])}
                    className={menuItemClass}
                  >
                    📦 Move
                  </button>
                  {isAdmin && (
                    <button onClick={() => openRestrictionModal(folder)} className={menuItemClass}>
                      🔒 Restrict access
                    </button>
                  )}
                  {canManage(currentUser, folder.createdById) && (
                    <button onClick={() => handleDeleteFolder(folder)} className={`${menuItemClass} text-red-600`}>
                      🗑️ Delete
                    </button>
                  )}
                </RowMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Files */}
      {files.length > 0 ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
          {files.map((file) => {
            const fileKind = getFileKind(file.mimeType);
            const isPreviewable = fileKind === "pdf" || fileKind === "image";
            const nameContent = (
              <>
                <span className="truncate">{file.displayName}</span>
                {file.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-600"
                  >
                    {tag.name}
                  </span>
                ))}
              </>
            );
            return (
              <li key={file.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleSelected("file", file.id)}
                  className="shrink-0 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                  aria-label={`Select ${file.displayName}`}
                />
                <FileTypeIcon fileId={file.id} mimeType={file.mimeType} />

                {editing?.type === "file" && editing.id === file.id ? (
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                    onBlur={saveEditing}
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                ) : isPreviewable ? (
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 text-left font-medium text-slate-800 hover:text-accent-dark"
                  >
                    {nameContent}
                  </button>
                ) : (
                  <a
                    href={`/api/files/${file.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 font-medium text-slate-800 hover:text-accent-dark"
                  >
                    {nameContent}
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
                    title={favFiles.has(file.id) ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => toggleFavorite("file", file.id)}
                    className="rounded p-1.5 text-amber-400 hover:bg-slate-100"
                  >
                    {favFiles.has(file.id) ? "⭐" : "☆"}
                  </button>
                  <a
                    title="Download"
                    href={`/api/files/${file.id}/download?download=1`}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    ⬇️
                  </a>
                  {canManage(currentUser, file.uploadedById) && (
                    <TagPicker
                      label="Tags"
                      selectedIds={file.tags.map((t) => t.id)}
                      onChange={(tagIds) => handleTagsChange("file", file.id, tagIds)}
                      disabled={busy}
                    />
                  )}
                  <RowMenu>
                    <button onClick={() => startEditing("file", file.id, file.displayName)} className={menuItemClass}>
                      ✏️ Rename
                    </button>
                    <button
                      onClick={() => openMoveModal([{ type: "file", id: file.id, name: file.displayName }])}
                      className={menuItemClass}
                    >
                      📦 Move
                    </button>
                    {canManage(currentUser, file.uploadedById) && (
                      <button onClick={() => handleDeleteFile(file)} className={`${menuItemClass} text-red-600`}>
                        🗑️ Delete
                      </button>
                    )}
                  </RowMenu>
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
      {moveTargets && moveTargets.length > 0 && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              {moveTargets.length === 1 ? `Move "${moveTargets[0].name}"` : `Move ${moveTargets.length} items`}
            </h2>
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
                onClick={() => setMoveTargets(null)}
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

      {/* File preview modal */}
      {previewFile && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-base font-semibold text-slate-800 truncate">{previewFile.displayName}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  title="Download"
                  href={`/api/files/${previewFile.id}/download?download=1`}
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ⬇️
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
            {getFileKind(previewFile.mimeType) === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files/${previewFile.id}/download`}
                alt={previewFile.displayName}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ) : (
              <iframe
                src={`/api/files/${previewFile.id}/download`}
                title={previewFile.displayName}
                className="h-[70vh] w-full rounded-md border border-slate-200"
              />
            )}
          </div>
        </div>
      )}

      {/* Folder restriction modal */}
      {restrictingFolder && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              Restrict &ldquo;{restrictingFolder.name}&rdquo;
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              Only members of the checked groups (plus admins) will be able to see this folder and
              everything inside it. Leave everything unchecked to make it visible to everyone.
            </p>
            {allGroups === null ? (
              <p className="text-sm text-slate-500 mb-4">Loading groups…</p>
            ) : allGroups.length === 0 ? (
              <p className="text-sm text-slate-500 mb-4">
                No groups exist yet — create one from the Groups admin page first.
              </p>
            ) : (
              <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                {allGroups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={restrictionGroupIds.has(g.id)}
                      onChange={() => toggleRestrictionGroup(g.id)}
                      className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRestrictingFolder(null)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestriction}
                disabled={busy}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
