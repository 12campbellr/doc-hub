import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { isDescendantOf, getSubtreeFolderIds } from "@/lib/folders";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { name?: string; parentId?: string | null } = {};
    let destinationName: string | null = null;

    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Folder name cannot be empty" }, { status: 400 });
      }
      data.name = name;
    }

    if ("parentId" in body) {
      const newParentId: string | null = body.parentId ? String(body.parentId) : null;

      if (newParentId === folder.id) {
        return NextResponse.json({ error: "A folder cannot be moved into itself" }, { status: 400 });
      }
      if (newParentId) {
        const parent = await prisma.folder.findUnique({ where: { id: newParentId } });
        if (!parent) {
          return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
        }
        if (await isDescendantOf(newParentId, folder.id)) {
          return NextResponse.json(
            { error: "Cannot move a folder into one of its own subfolders" },
            { status: 400 }
          );
        }
        destinationName = parent.name;
      } else {
        destinationName = "Home";
      }
      data.parentId = newParentId;
    }

    const updated = await prisma.folder.update({ where: { id: folder.id }, data });

    if (data.name) {
      await logActivity({
        action: "FOLDER_RENAME",
        targetType: "FOLDER",
        targetName: updated.name,
        details: `renamed "${folder.name}" to "${updated.name}"`,
        actorId: user.id,
      });
    }
    if (destinationName) {
      await logActivity({
        action: "FOLDER_MOVE",
        targetType: "FOLDER",
        targetName: updated.name,
        details: `moved to "${destinationName}"`,
        actorId: user.id,
      });
    }

    return NextResponse.json({ folder: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && folder.createdById !== user.id) {
      throw new ForbiddenError("Only an admin or the folder's creator can delete it");
    }

    // Subfolders/files cascade-delete at the DB level; clean up their on-disk contents first.
    const subtreeFolderIds = await getSubtreeFolderIds(folder.id);
    const filesInside = await prisma.file.findMany({ where: { folderId: { in: subtreeFolderIds } } });
    const { deleteFile } = await import("@/lib/storage");
    await Promise.all(filesInside.map((f) => deleteFile(f.storagePath).catch(() => undefined)));

    await prisma.folder.delete({ where: { id: folder.id } });

    await logActivity({
      action: "FOLDER_DELETE",
      targetType: "FOLDER",
      targetName: folder.name,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
