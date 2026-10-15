-- CreateTable
CREATE TABLE "QualifierOverride" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "candidateId" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualifierOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualifierOverride_seasonId_orgUnitId_level_key" ON "QualifierOverride"("seasonId", "orgUnitId", "level");
