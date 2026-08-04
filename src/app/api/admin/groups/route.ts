import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  try {
    await requireAdmin();
    const groups = await prisma.group.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { restrictedFolders: true, members: true } },
      },
    });
    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        createdAt: g.createdAt,
        restrictedFolderCount: g._count.restrictedFolders,
        memberCount: g._count.members,
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
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "A group with that name already exists" }, { status: 409 });
    }

    const group = await prisma.group.create({ data: { name } });

    await logActivity({
      action: "GROUP_CREATE",
      targetType: "GROUP",
      targetName: group.name,
      actorId: admin.id,
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
