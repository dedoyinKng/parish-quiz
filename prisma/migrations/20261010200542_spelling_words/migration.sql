-- CreateTable
CREATE TABLE "SpellingWord" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "word" TEXT NOT NULL,
    "sentence" TEXT,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpellingWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpellingWord_seasonId_level_idx" ON "SpellingWord"("seasonId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "SpellingWord_seasonId_level_word_key" ON "SpellingWord"("seasonId", "level", "word");
