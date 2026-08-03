import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

/** Flat list of every folder, for the "Move to..." destination picker. */
export async function GET() {
  try {
    await requireUser();
    const folders = await prisma.folder.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    });
    return NextResponse.json({ folders });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();
    const parentId = body?.parentId ? String(body.parentId) : null;

    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    if (parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const folder = await prisma.folder.create({
      data: { name, parentId, createdById: user.id },
    });

    await logActivity({
      action: "FOLDER_CREATE",
      targetType: "FOLDER",
      targetName: folder.name,
      actorId: user.id,
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
