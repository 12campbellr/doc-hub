export type TagRef = { id: string; name: string };

export type FolderSummary = {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string | null;
  /** Group ids this folder is directly restricted to (empty = unrestricted). Does not
   *  include restrictions inherited from an ancestor folder. */
  restrictedGroupIds: string[];
  tags: TagRef[];
};

export type FileSummary = {
  id: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedById: string | null;
  uploadedByName: string;
  tags: TagRef[];
};

export type Crumb = { id: string; name: string };

export type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "TECHNICIAN";
};
