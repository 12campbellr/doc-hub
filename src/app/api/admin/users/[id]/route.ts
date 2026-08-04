import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: { role?: string; groups?: { set: { id: string }[] } } = {};

    if ("role" in body) {
      const role = body.role === "ADMIN" ? "ADMIN" : "TECHNICIAN";
      if (target.role === "ADMIN" && role !== "ADMIN") {
        const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          return NextResponse.json({ error: "Can't demote the last admin account" }, { status: 400 });
        }
      }
      data.role = role;
    }

    if ("groupIds" in body) {
      const groupIds: string[] = Array.isArray(body.groupIds) ? body.groupIds.map(String) : [];
      data.groups = { set: groupIds.map((groupId) => ({ id: groupId })) };
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true, groups: { select: { id: true } } },
    });

    await logActivity({
      action: "USER_UPDATE",
      targetType: "USER",
      targetName: updated.name,
      details: updated.email,
      actorId: admin.id,
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        createdAt: updated.createdAt,
        groupIds: updated.groups.map((g) => g.id),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

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
