/*
  Warnings:

  - A unique constraint covering the columns `[seasonId,orgUnitId,level,track]` on the table `QualifierOverride` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "QualifierOverride_seasonId_orgUnitId_level_key";

-- AlterTable
ALTER TABLE "QualifierOverride" ADD COLUMN     "track" TEXT NOT NULL DEFAULT 'QUIZ';

-- CreateIndex
CREATE UNIQUE INDEX "QualifierOverride_seasonId_orgUnitId_level_track_key" ON "QualifierOverride"("seasonId", "orgUnitId", "level", "track");
