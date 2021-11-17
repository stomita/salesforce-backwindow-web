-- CreateTable
CREATE TABLE "Org" (
    "id" SERIAL NOT NULL,
    "sfUserId" TEXT NOT NULL,
    "sfOrgId" TEXT NOT NULL,
    "appClientId" TEXT,
    "appPrivateKey" TEXT,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedEntry" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "AllowedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_sfUserId_key" ON "Org"("sfUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Org_sfOrgId_key" ON "Org"("sfOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedEntry_orgId_email_key" ON "AllowedEntry"("orgId", "email");

-- AddForeignKey
ALTER TABLE "AllowedEntry" ADD CONSTRAINT "AllowedEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
