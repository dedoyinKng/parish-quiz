-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "competition" "Competition" NOT NULL,
    "level" "Level" NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questionCount" INTEGER,
    "pin" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_orgUnitId_idx" ON "Exam"("orgUnitId");

-- CreateIndex
CREATE INDEX "Exam_startsAt_idx" ON "Exam"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_seasonId_competition_level_orgUnitId_key" ON "Exam"("seasonId", "competition", "level", "orgUnitId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
