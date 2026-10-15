import { db } from "@/lib/db";
import { markQuestion } from "@/lib/quiz";
import type { QuestionContent } from "@/lib/questions";

function spellNorm(v: unknown) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Marks an attempt and closes it. Safe to call more than once.
export async function finalizeAttempt(attemptId: string) {
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { competition: true } } },
  });
  if (!attempt || attempt.submittedAt) return;

  const ids = attempt.questionIds as string[];
  const answers = (attempt.answers ?? {}) as Record<string, unknown>;

  let score = 0;
  let max = 0;

  if (attempt.exam.competition === "SPELLING_BEE") {
    const words = await db.spellingWord.findMany({
      where: { id: { in: ids } },
      select: { id: true, word: true },
    });
    for (const w of words) {
      max += 1;
      const given = spellNorm(answers[w.id]);
      if (given !== "" && given === spellNorm(w.word)) score += 1;
    }
  } else {
    const questions = await db.question.findMany({ where: { id: { in: ids } } });
    for (const q of questions) {
      max += q.marks;
      score += markQuestion(q.type, q.content as QuestionContent, answers[q.id], q.marks);
    }
  }

  const closedAt = new Date(Math.min(Date.now(), attempt.endsAt.getTime()));
  await db.attempt.updateMany({
    where: { id: attemptId, submittedAt: null },
    data: {
      submittedAt: closedAt,
      score: Math.round(score * 100) / 100,
      maxScore: max,
    },
  });
}
