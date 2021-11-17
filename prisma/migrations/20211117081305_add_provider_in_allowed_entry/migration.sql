/*
  Warnings:

  - A unique constraint covering the columns `[orgId,provider,email]` on the table `AllowedEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AllowedEntry_orgId_email_key";

-- AlterTable
ALTER TABLE "AllowedEntry" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT E'salesforce';

-- CreateIndex
CREATE UNIQUE INDEX "AllowedEntry_orgId_provider_email_key" ON "AllowedEntry"("orgId", "provider", "email");
