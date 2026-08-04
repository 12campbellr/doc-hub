-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FolderToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_FileToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_FolderToTag_AB_unique" ON "_FolderToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_FolderToTag_B_index" ON "_FolderToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToTag_AB_unique" ON "_FileToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToTag_B_index" ON "_FileToTag"("B");

-- AddForeignKey
ALTER TABLE "_FolderToTag" ADD CONSTRAINT "_FolderToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FolderToTag" ADD CONSTRAINT "_FolderToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
