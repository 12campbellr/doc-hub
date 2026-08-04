import { prisma } from "@/lib/prisma";

export type ActivityAction =
  | "FOLDER_CREATE"
  | "FOLDER_RENAME"
  | "FOLDER_MOVE"
  | "FOLDER_DELETE"
  | "FOLDER_RESTRICT"
  | "FILE_UPLOAD"
  | "FILE_RENAME"
  | "FILE_MOVE"
  | "FILE_DELETE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "GROUP_CREATE"
  | "GROUP_DELETE";

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  FOLDER_CREATE: "created folder",
  FOLDER_RENAME: "renamed folder",
  FOLDER_MOVE: "moved folder",
  FOLDER_DELETE: "deleted folder",
  FOLDER_RESTRICT: "changed access on folder",
  FILE_UPLOAD: "uploaded file",
  FILE_RENAME: "renamed file",
  FILE_MOVE: "moved file",
  FILE_DELETE: "deleted file",
  USER_CREATE: "created account for",
  USER_UPDATE: "updated account for",
  USER_DELETE: "deleted account for",
  GROUP_CREATE: "created group",
  GROUP_DELETE: "deleted group",
};

/**
 * Records an entry in the admin-only activity log. Fire-and-forget from callers'
 * perspective — logging failures are swallowed so they never block the actual
 * mutation that triggered them.
 */
export async function logActivity(entry: {
  action: ActivityAction;
  targetType: "FOLDER" | "FILE" | "USER" | "GROUP";
  targetName: string;
  details?: string;
  actorId: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action: entry.action,
        targetType: entry.targetType,
        targetName: entry.targetName,
        details: entry.details,
        actorId: entry.actorId,
      },
    });
  } catch (err) {
    console.error("Failed to record activity log entry", err);
  }
}
