import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ACTIVITY_LABELS, type ActivityAction } from "@/lib/activity-log";

const LIMIT = 200;

const TARGET_ICON: Record<string, string> = {
  FOLDER: "📁",
  FILE: "📄",
  USER: "👤",
  GROUP: "👥",
  TAG: "🏷️",
};

export default async function ActivityLogPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/");

  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    include: { actor: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Activity Log</h1>
      <p className="text-sm text-slate-500 mb-4">
        Every folder, document, and account change made across DOC Hub.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No activity recorded yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {entries.map((entry) => {
              const label = ACTIVITY_LABELS[entry.action as ActivityAction] ?? entry.action;
              const icon = TARGET_ICON[entry.targetType] ?? "•";
              const actorName = entry.actor?.name ?? "Removed user";
              return (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-lg shrink-0" aria-hidden>
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{actorName}</span> {label}{" "}
                      <span className="font-medium">&ldquo;{entry.targetName}&rdquo;</span>
                    </p>
                    {entry.details && <p className="text-xs text-slate-500 truncate">{entry.details}</p>}
                  </div>
                  <time className="shrink-0 text-xs text-slate-400 whitespace-nowrap">
                    {entry.createdAt.toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ul>
          {entries.length === LIMIT && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              Showing the most recent {LIMIT} entries.
            </p>
          )}
        </>
      )}
    </div>
  );
}
