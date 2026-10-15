-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "seasonId" TEXT;

-- CreateIndex
CREATE INDEX "Question_seasonId_competition_level_idx" ON "Question"("seasonId", "competition", "level");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
