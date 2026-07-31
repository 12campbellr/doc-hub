import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { saveFile, sanitizeFilename, MAX_FILE_SIZE_BYTES } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    const folderIdRaw = form.get("folderId");
    const displayNameRaw = form.get("displayName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    const folderId = folderIdRaw ? String(folderIdRaw) : null;
    if (folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId } });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    const originalFilename = sanitizeFilename(file.name || "upload");
    const displayName = displayNameRaw ? String(displayNameRaw).trim() : originalFilename;

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = await saveFile(buffer, originalFilename);

    const record = await prisma.file.create({
      data: {
        displayName: displayName || originalFilename,
        originalFilename,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        storagePath,
        folderId,
        uploadedById: user.id,
      },
    });

    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
