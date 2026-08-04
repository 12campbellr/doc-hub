-- AlterTable
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- Grandfather every account that already exists so current staff aren't forced
-- through the change-password interstitial; only accounts created after this
-- migration (seeded or admin-created) keep the `true` default.
UPDATE "User" SET "mustChangePassword" = false;
