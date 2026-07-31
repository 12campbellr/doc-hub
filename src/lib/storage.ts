import path from "node:path";
import { randomUUID } from "node:crypto";
import { put, del, get } from "@vercel/blob";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/** Strips path separators and control characters so a filename is safe to keep for display/extension purposes. */
export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[\\/:*?"<>| -]/g, "_").trim();
  return base.length > 0 ? base.slice(0, 255) : "file";
}

/**
 * Uploads a buffer to Vercel Blob under a random key (collision-proof, no path-traversal
 * risk from user input) and returns the blob's URL to persist in the DB. Stored private —
 * our own auth-gated download route (src/app/api/files/[id]/download) is the only sanctioned
 * path to file bytes, not the blob URL directly.
 */
export async function saveFile(buffer: Buffer, originalFilename: string): Promise<string> {
  const ext = path.extname(sanitizeFilename(originalFilename));
  const key = `${randomUUID()}${ext}`;
  const blob = await put(key, buffer, { access: "private", addRandomSuffix: false });
  return blob.url;
}

export async function readFile(storagePath: string): Promise<Buffer> {
  const result = await get(storagePath, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error("Failed to read stored file");
  }
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function deleteFile(storagePath: string): Promise<void> {
  await del(storagePath);
}
