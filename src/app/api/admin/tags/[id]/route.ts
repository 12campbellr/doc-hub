import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();
    if (!name) {
      return NextResponse.json({ error: "Tag name cannot be empty" }, { status: 400 });
    }

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
    }

    const updated = await prisma.tag.update({ where: { id }, data: { name } });
    return NextResponse.json({ tag: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Implicit m2m join rows cascade-delete with the Tag, so it's simply removed
    // from any folder/file that had it.
    await prisma.tag.delete({ where: { id } });

    await logActivity({
      action: "TAG_DELETE",
      targetType: "TAG",
      targetName: tag.name,
      actorId: admin.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
