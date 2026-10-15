-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MULTIPLE_SHORT_ANSWER', 'FILL_IN_GAP', 'TRUE_FALSE', 'MATCHING', 'SEQUENCE');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "competition" "Competition" NOT NULL,
    "level" "Level" NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "explanation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_competition_level_idx" ON "Question"("competition", "level");

-- CreateIndex
CREATE INDEX "Question_createdById_idx" ON "Question"("createdById");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
