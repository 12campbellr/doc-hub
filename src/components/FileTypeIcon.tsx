import { getFileKind, FILE_KIND_STYLES } from "@/lib/format";

/**
 * Real thumbnail for images (small, lazy-loaded); a colored badge for
 * everything else. True PDF page-content thumbnails would need either a
 * native rendering dependency or an external service — out of scope for now.
 */
export default function FileTypeIcon({ fileId, mimeType }: { fileId: string; mimeType: string }) {
  const kind = getFileKind(mimeType);

  if (kind === "image") {
    return (
      <img
        src={`/api/files/${fileId}/download`}
        alt=""
        loading="lazy"
        className="shrink-0 h-10 w-10 rounded object-cover border border-slate-200"
      />
    );
  }

  const style = FILE_KIND_STYLES[kind];
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${style.className}`}>
      {style.label}
    </span>
  );
}
