import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TECHNICIAN";
};

/**
 * Resolves the current user, re-checking the DB so a deleted account loses
 * access immediately rather than waiting for its existing JWT to expire.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as unknown as SessionUser;

  const stillExists = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!stillExists) return null;

  return user;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Not signed in") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Not allowed") {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access required");
  return user;
}
