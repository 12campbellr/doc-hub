import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = await req.json();
    const name = (body?.name ?? "").toString().trim();
    if (!name) {
      return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 });
    }

    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "A group with that name already exists" }, { status: 409 });
    }

    const updated = await prisma.group.update({ where: { id }, data: { name } });
    return NextResponse.json({ group: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Implicit m2m join rows cascade-delete with the Group, so any folder solely
    // restricted to this group becomes unrestricted (visible to everyone) automatically.
    await prisma.group.delete({ where: { id } });

    await logActivity({
      action: "GROUP_DELETE",
      targetType: "GROUP",
      targetName: group.name,
      actorId: admin.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
