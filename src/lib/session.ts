import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TECHNICIAN";
  mustChangePassword: boolean;
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

export class PasswordChangeRequiredError extends Error {
  status = 403;
  constructor(message = "Password change required") {
    super(message);
  }
}

/**
 * Middleware only protects page navigation (see src/middleware.ts), so this is the
 * defense-in-depth check that stops a flagged user from bypassing the change-password
 * interstitial by calling mutating API routes directly. Only the password-change route
 * itself should pass `allowPasswordChangePending: true`.
 */
export async function requireUser(opts?: { allowPasswordChangePending?: boolean }): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (user.mustChangePassword && !opts?.allowPasswordChangePending) {
    throw new PasswordChangeRequiredError();
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access required");
  return user;
}
