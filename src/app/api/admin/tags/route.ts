import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

/** Any signed-in user can list the tag vocabulary (needed to apply tags), not just admins. */
export async function GET() {
  try {
    await requireUser();
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { folders: true, files: true } } },
    });
    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        usageCount: t._count.folders + t._count.files,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();

    if (!name) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
    }

    const tag = await prisma.tag.create({ data: { name } });

    await logActivity({
      action: "TAG_CREATE",
      targetType: "TAG",
      targetName: tag.name,
      actorId: admin.id,
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
