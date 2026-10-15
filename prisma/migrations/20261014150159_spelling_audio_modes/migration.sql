-- AlterTable
ALTER TABLE "SpellingWord" ADD COLUMN     "audio" BYTEA,
ADD COLUMN     "audioAt" TIMESTAMP(3),
ADD COLUMN     "audioMime" TEXT,
ADD COLUMN     "audioSource" TEXT NOT NULL DEFAULT 'TTS',
ADD COLUMN     "audioVoice" TEXT,
ADD COLUMN     "hint" TEXT;
