import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Can't delete the last admin account" }, { status: 400 });
      }
    }

    // Folders/files this user created keep existing (shared library) via onDelete: SetNull.
    await prisma.user.delete({ where: { id } });

    await logActivity({
      action: "USER_DELETE",
      targetType: "USER",
      targetName: target.name,
      details: target.email,
      actorId: admin.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
