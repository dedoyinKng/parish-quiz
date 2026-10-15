"use server";

import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PLAY_COOKIE } from "@/lib/exams";
import { finalizeAttempt } from "@/lib/quiz-server";

async function currentAttempt() {
  const token = (await cookies()).get(PLAY_COOKIE)?.value;
  if (!token) return null;
  return db.attempt.findUnique({ where: { token } });
}

// Saves one answer. Refused once the time is up or the quiz is submitted.
export async function saveAnswerAction(
  questionId: string,
  answer: unknown
): Promise<{ ok: boolean; closed?: boolean }> {
  const a = await currentAttempt();
  if (!a) return { ok: false, closed: true };
  if (a.submittedAt || Date.now() > a.endsAt.getTime() + 5000)
    return { ok: false, closed: true };
  if (!(a.questionIds as string[]).includes(questionId)) return { ok: false };
  if (JSON.stringify(answer ?? null).length > 5000) return { ok: false };

  const next = {
    ...((a.answers ?? {}) as Record<string, unknown>),
    [questionId]: answer ?? null,
  };
  await db.attempt.update({
    where: { id: a.id },
    data: { answers: next as Prisma.InputJsonValue },
  });
  return { ok: true };
}

export async function submitQuizAction(): Promise<void> {
  const a = await currentAttempt();
  if (a) await finalizeAttempt(a.id);
}
