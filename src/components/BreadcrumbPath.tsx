import type { Crumb } from "@/lib/folders";

export default function BreadcrumbPath({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <p className="text-xs text-slate-400 truncate">
      Home{crumbs.map((c) => ` / ${c.name}`).join("")}
    </p>
  );
}
