import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { readFile } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await readFile(file.storagePath);
    const download = req.nextUrl.searchParams.get("download") === "1";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(
          file.displayName
        )}"`,
        "Content-Length": String(file.sizeBytes),
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
