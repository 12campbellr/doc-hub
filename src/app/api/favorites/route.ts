import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { canUserAccessFolder } from "@/lib/permissions";

function parseTarget(body: any): { targetType: "FOLDER" | "FILE"; targetId: string } | null {
  const targetType = body?.targetType === "FOLDER" || body?.targetType === "FILE" ? body.targetType : null;
  const targetId = typeof body?.targetId === "string" && body.targetId ? body.targetId : null;
  if (!targetType || !targetId) return null;
  return { targetType, targetId };
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const target = parseTarget(await req.json());
    if (!target) {
      return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
    }

    if (target.targetType === "FOLDER") {
      const folder = await prisma.folder.findUnique({ where: { id: target.targetId } });
      if (!folder || !(await canUserAccessFolder(user, folder.id))) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
    } else {
      const file = await prisma.file.findUnique({ where: { id: target.targetId } });
      if (!file || !(await canUserAccessFolder(user, file.folderId))) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    try {
      await prisma.favorite.create({
        data: {
          userId: user.id,
          folderId: target.targetType === "FOLDER" ? target.targetId : null,
          fileId: target.targetType === "FILE" ? target.targetId : null,
        },
      });
    } catch (err) {
      // Unique constraint violation just means it's already favorited — treat as success.
      if (!(err instanceof Error) || !err.message.includes("Unique constraint")) throw err;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const target = parseTarget(await req.json());
    if (!target) {
      return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        ...(target.targetType === "FOLDER" ? { folderId: target.targetId } : { fileId: target.targetId }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
