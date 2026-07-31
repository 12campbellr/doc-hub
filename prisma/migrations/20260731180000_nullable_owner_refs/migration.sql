-- Allow deleting a User without losing their folders/files: the owner
-- reference becomes optional and is cleared (not cascaded) on delete.

-- Folder.createdById
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_createdById_fkey";
ALTER TABLE "Folder" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- File.uploadedById
ALTER TABLE "File" DROP CONSTRAINT "File_uploadedById_fkey";
ALTER TABLE "File" ALTER COLUMN "uploadedById" DROP NOT NULL;
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
