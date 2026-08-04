import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { readFile, MAX_ZIP_DOWNLOAD_BYTES } from "@/lib/storage";
import { formatBytes } from "@/lib/format";
import { getSubtreeFolderIds } from "@/lib/folders";

type FileRecord = { id: string; displayName: string; storagePath: string; sizeBytes: number };

/** Strips path separators so a name is safe to use as a single zip entry segment. */
function sanitizeSegment(name: string): string {
  const cleaned = name.replace(/[\\/]/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "untitled";
}

/** Appends " (2)", " (3)", etc. before the extension to keep zip entry paths unique. */
function uniquePath(path: string, used: Set<string>): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const slash = path.lastIndexOf("/");
  const dot = path.lastIndexOf(".");
  const base = dot > slash ? path.slice(0, dot) : path;
  const ext = dot > slash ? path.slice(dot) : "";
  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Bulk-download endpoint: bundles selected files and folders (recursively) into a
 * single zip. Any signed-in user may call this — it's a read-only aggregation of
 * files they could already download individually.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json().catch(() => ({}));
    const fileIds: string[] = Array.isArray(body?.fileIds) ? body.fileIds.map(String) : [];
    const folderIds: string[] = Array.isArray(body?.folderIds) ? body.folderIds.map(String) : [];

    if (fileIds.length === 0 && folderIds.length === 0) {
      return NextResponse.json({ error: "Nothing selected" }, { status: 400 });
    }

    const usedPaths = new Set<string>();
    const includedIds = new Set<string>();
    const entries: { file: FileRecord; path: string }[] = [];

    const selectedFolders = await prisma.folder.findMany({ where: { id: { in: folderIds } } });

    for (const root of selectedFolders) {
      const subtreeIds = await getSubtreeFolderIds(root.id);
      const subtreeFolders = await prisma.folder.findMany({
        where: { id: { in: subtreeIds } },
        select: { id: true, name: true, parentId: true },
      });
      const foldersById = new Map(subtreeFolders.map((f) => [f.id, f]));

      // Builds the chain of folder names from this selection's root down to `folderId`.
      const dirsFor = (folderId: string): string[] => {
        const chain: string[] = [];
        let currentId: string | null = folderId;
        while (currentId) {
          const folder = foldersById.get(currentId);
          if (!folder) break;
          chain.unshift(sanitizeSegment(folder.name));
          if (currentId === root.id) break;
          currentId = folder.parentId;
        }
        return chain;
      };

      const filesInSubtree = await prisma.file.findMany({ where: { folderId: { in: subtreeIds } } });
      for (const file of filesInSubtree) {
        if (includedIds.has(file.id)) continue;
        includedIds.add(file.id);
        const dirs = file.folderId ? dirsFor(file.folderId) : [sanitizeSegment(root.name)];
        const path = uniquePath(`${dirs.join("/")}/${sanitizeSegment(file.displayName)}`, usedPaths);
        entries.push({ file, path });
      }
    }

    const remainingFileIds = fileIds.filter((id) => !includedIds.has(id));
    if (remainingFileIds.length > 0) {
      const looseFiles = await prisma.file.findMany({ where: { id: { in: remainingFileIds } } });
      for (const file of looseFiles) {
        includedIds.add(file.id);
        const path = uniquePath(sanitizeSegment(file.displayName), usedPaths);
        entries.push({ file, path });
      }
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "No files found in the selection" }, { status: 404 });
    }

    const totalBytes = entries.reduce((sum, entry) => sum + entry.file.sizeBytes, 0);
    if (totalBytes > MAX_ZIP_DOWNLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `Selection totals ${formatBytes(totalBytes)}, over the ${formatBytes(
            MAX_ZIP_DOWNLOAD_BYTES
          )} zip limit. Select fewer items.`,
        },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    for (const { file, path } of entries) {
      zip.file(path, await readFile(file.storagePath));
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const zipName =
      selectedFolders.length === 1 && fileIds.length === 0
        ? `${sanitizeSegment(selectedFolders[0].name)}.zip`
        : "dochub-download.zip";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(zipName)}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
