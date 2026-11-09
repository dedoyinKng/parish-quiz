"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { finalizeAttempt } from "@/lib/quiz-server";
import { canScheduleExams } from "@/lib/exams";

// Teachers and coordinators who can see the unit may manage its attempts.
async function load(attemptId: string) {
  const user = await requireUser();
  if (!canScheduleExams(user.role)) return null;
  const a = await db.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { orgUnitId: true } } },
  });
  if (!a) return null;
  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === a.exam.orgUnitId)) return null;
  return a;
}

/** Adds time to a running attempt, or reopens a finished one with that much time. */
export async function extendAction(fd: FormData): Promise<void> {
  const a = await load(String(fd.get("attemptId") ?? ""));
  if (!a) return;
  const mins = Math.min(60, Math.max(1, Math.round(Number(fd.get("minutes")) || 0)));
  const now = new Date();

  if (a.submittedAt) {
    await db.attempt.update({
      where: { id: a.id },
      data: {
        submittedAt: null,
        score: null,
        maxScore: null,
        endsAt: new Date(now.getTime() + mins * 60_000),
      },
    });
  } else {
    const base = a.endsAt > now ? a.endsAt : now;
    await db.attempt.update({
      where: { id: a.id },
      data: { endsAt: new Date(base.getTime() + mins * 60_000) },
    });
  }
  revalidatePath(`/dashboard/monitor/${a.examId}`);
}

/** Closes and marks an attempt right now. */
export async function submitNowAction(fd: FormData): Promise<void> {
  const a = await load(String(fd.get("attemptId") ?? ""));
  if (!a || a.submittedAt) return;
  await finalizeAttempt(a.id);
  revalidatePath(`/dashboard/monitor/${a.examId}`);
}


/** Lets a blocked candidate try again straight away. */
export async function clearLockAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  if (!canScheduleExams(user.role)) return;
  const exam = await db.exam.findUnique({
    where: { id: String(fd.get("examId") ?? "") },
    select: { id: true, orgUnitId: true },
  });
  if (!exam) return;
  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === exam.orgUnitId)) return;
  const cand = await db.candidate.findUnique({
    where: { id: String(fd.get("candidateId") ?? "") },
    select: { code: true },
  });
  if (!cand) return;
  await db.playThrottle.deleteMany({
    where: { key: { contains: cand.code, mode: "insensitive" } },
  });
  revalidatePath("/dashboard/monitor/" + exam.id);
}
