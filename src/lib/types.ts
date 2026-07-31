export type FolderSummary = {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
};

export type FileSummary = {
  id: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedById: string;
  uploadedByName: string;
};

export type Crumb = { id: string; name: string };

export type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "TECHNICIAN";
};
