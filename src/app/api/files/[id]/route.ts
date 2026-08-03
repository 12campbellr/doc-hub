import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { deleteFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { displayName?: string; folderId?: string | null } = {};
    let destinationName: string | null = null;

    if (typeof body?.displayName === "string") {
      const displayName = body.displayName.trim();
      if (!displayName) {
        return NextResponse.json({ error: "File name cannot be empty" }, { status: 400 });
      }
      data.displayName = displayName;
    }

    if ("folderId" in body) {
      const folderId: string | null = body.folderId ? String(body.folderId) : null;
      if (folderId) {
        const folder = await prisma.folder.findUnique({ where: { id: folderId } });
        if (!folder) {
          return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
        }
        destinationName = folder.name;
      } else {
        destinationName = "Home";
      }
      data.folderId = folderId;
    }

    const updated = await prisma.file.update({ where: { id: file.id }, data });

    if (data.displayName) {
      await logActivity({
        action: "FILE_RENAME",
        targetType: "FILE",
        targetName: updated.displayName,
        details: `renamed "${file.displayName}" to "${updated.displayName}"`,
        actorId: user.id,
      });
    }
    if (destinationName) {
      await logActivity({
        action: "FILE_MOVE",
        targetType: "FILE",
        targetName: updated.displayName,
        details: `moved to "${destinationName}"`,
        actorId: user.id,
      });
    }

    return NextResponse.json({ file: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && file.uploadedById !== user.id) {
      throw new ForbiddenError("Only an admin or the uploader can delete this file");
    }

    await deleteFile(file.storagePath);
    await prisma.file.delete({ where: { id: file.id } });

    await logActivity({
      action: "FILE_DELETE",
      targetType: "FILE",
      targetName: file.displayName,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
