export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export type FileKind = "pdf" | "word" | "excel" | "image" | "other";

export function getFileKind(mimeType: string): FileKind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("word") || mimeType.includes("msword")) return "word";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "excel";
  return "other";
}

export const FILE_KIND_STYLES: Record<FileKind, { label: string; className: string }> = {
  pdf: { label: "PDF", className: "bg-red-100 text-red-700" },
  word: { label: "DOC", className: "bg-blue-100 text-blue-700" },
  excel: { label: "XLS", className: "bg-green-100 text-green-700" },
  image: { label: "IMG", className: "bg-amber-100 text-amber-700" },
  other: { label: "FILE", className: "bg-slate-200 text-slate-700" },
};
