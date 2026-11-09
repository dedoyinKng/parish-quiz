"use server";

import { randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import { LATE_ENTRY_MINUTES, PLAY_COOKIE } from "@/lib/exams";
import { checkQualified } from "@/lib/qualify";
import { blockedFor, clearKey, recordFailure } from "@/lib/throttle";

type State = {
  error?: string;
  waiting?: { opensAt: string; serverNow: string; title: string };
};

const NOT_FOUND =
  "We could not find that candidate ID with that PIN. Check both and try again.";
const NOT_QUALIFIED =
  "This quiz is only for candidates who qualified from the previous stage.";
const UNDECIDED =
  "Your result at the previous stage is tied for first. Please wait for your coordinator's decision.";

// wrong-guess limits
const CODE_MAX = 5; // wrong tries per candidate ID
const IP_MAX = 60; // wrong tries per internet address (a venue shares one)
const WINDOW_MS = 10 * 60_000;
const BLOCK_MS = 10 * 60_000;

async function setPlayCookie(token: string, endsAt: Date) {
  const jar = await cookies();
  jar.set(PLAY_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(endsAt.getTime() + 3600_000),
  });
}

function waitText(seconds: number) {
  const m = Math.ceil(seconds / 60);
  return `Too many wrong attempts. Please try again in ${m} minute${m === 1 ? "" : "s"}.`;
}

export async function playLoginAction(
  _prev: State,
  fd: FormData
): Promise<State> {
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  const pin = String(fd.get("pin") ?? "").trim();
  if (!code) return { error: "Enter your candidate ID." };
  if (!/^\d{6}$/.test(pin)) return { error: "The PIN is 6 digits." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const codeKey = `code:${code}`;
  const ipKey = `ip:${ip}`;

  const wait = Math.max(await blockedFor(codeKey), await blockedFor(ipKey));
  if (wait > 0) return { error: waitText(wait) };

  const wrong = async (): Promise<State> => {
    await recordFailure(codeKey, CODE_MAX, WINDOW_MS, BLOCK_MS);
    await recordFailure(ipKey, IP_MAX, WINDOW_MS, BLOCK_MS);
    return { error: NOT_FOUND };
  };

  const candidate = await db.candidate.findUnique({
    where: { code },
    include: { entries: true },
  });
  if (!candidate || candidate.status === "WITHDRAWN") return wrong();

  // the candidate's parish and every unit above it
  const units = await db.orgUnit.findMany({ select: { id: true, parentId: true } });
  const parentOf = new Map(units.map((u) => [u.id, u.parentId]));
  const chain = new Set<string>();
  let cur: string | null = candidate.parishId;
  while (cur && !chain.has(cur)) {
    chain.add(cur);
    cur = parentOf.get(cur) ?? null;
  }

  const found = await db.exam.findMany({
    where: {
      pin,
      seasonId: candidate.seasonId,
      level: candidate.level,
      competition: { in: candidate.entries.map((e) => e.competition) },
    },
  });

  // Zeal and Bible quizzes above parish level are for qualifiers only
  const inChain = found.filter((e) => chain.has(e.orgUnitId));
  const allowed: typeof found = [];
  let blocked: "NOT_WINNER" | "UNDECIDED" | null = null;
  for (const e of inChain) {
    if (
      e.competition === "ZEAL_QUIZ" ||
      e.competition === "BIBLE_QUIZ" ||
      e.competition === "SPELLING_BEE"
    ) {
      const g = await checkQualified({
        candidateId: candidate.id,
        parishId: candidate.parishId,
        seasonId: candidate.seasonId,
        level: candidate.level,
        examUnitId: e.orgUnitId,
        parentOf,
        track: e.competition === "SPELLING_BEE" ? "SPELLING_BEE" : "QUIZ",
      });
      if (!g.ok) {
        if (blocked !== "UNDECIDED") blocked = g.reason;
        continue;
      }
    }
    allowed.push(e);
  }
  const mine = allowed.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  if (mine.length === 0) {
    // the PIN matched an exam but the candidate may not enter it: not a guess
    if (blocked === "UNDECIDED") return { error: UNDECIDED };
    if (blocked === "NOT_WINNER") return { error: NOT_QUALIFIED };
    return wrong();
  }

  // correct ID and PIN: clear the counter for this candidate
  await clearKey(codeKey);

  const now = new Date();
  const attempts = await db.attempt.findMany({
    where: { candidateId: candidate.id, examId: { in: mine.map((e) => e.id) } },
  });

  // carry on with a quiz already in progress
  const resumable = attempts.find((a) => !a.submittedAt && a.endsAt > now);
  if (resumable) {
    await setPlayCookie(resumable.token, resumable.endsAt);
    redirect("/play/quiz");
  }

  const lateMs = LATE_ENTRY_MINUTES * 60_000;
  const exam =
    mine.find((e) => now.getTime() <= e.startsAt.getTime() + lateMs) ??
    mine[mine.length - 1];

  const used = attempts.find((a) => a.examId === exam.id);
  if (used)
    return {
      error: used.submittedAt
        ? "You have already submitted this quiz."
        : "Your time for this quiz is over.",
    };

  // the start time is enforced here, on the server
  if (now < exam.startsAt) {
    return {
      waiting: {
        opensAt: exam.startsAt.toISOString(),
        serverNow: now.toISOString(),
        title: `${COMPETITION_LABEL[exam.competition]} · ${LEVEL_LABEL[exam.level]}`,
      },
    };
  }
  if (now.getTime() > exam.startsAt.getTime() + lateMs)
    return { error: "Entry for this quiz has closed." };

  // pick and shuffle this candidate's questions (or Spelling Bee words)
  const pool =
    exam.competition === "SPELLING_BEE"
      ? await db.spellingWord.findMany({
          where: {
            seasonId: exam.seasonId,
            level: exam.level,
            audioAt: { not: null },
          },
          select: { id: true },
        })
      : await db.question.findMany({
          where: {
            seasonId: exam.seasonId,
            competition: exam.competition,
            level: exam.level,
            active: true,
          },
          select: { id: true },
        });
  if (pool.length === 0)
    return { error: "This quiz has no questions yet. Tell your teacher." };

  const ids = pool.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const chosen = exam.questionCount ? ids.slice(0, exam.questionCount) : ids;

  const token = randomBytes(24).toString("hex");
  const endsAt = new Date(now.getTime() + exam.durationMinutes * 60_000);

  try {
    await db.attempt.create({
      data: {
        token,
        examId: exam.id,
        candidateId: candidate.id,
        endsAt,
        questionIds: chosen,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "Something went wrong. Please try again." };
    throw e;
  }

  await setPlayCookie(token, endsAt);
  redirect("/play/quiz");
}

export async function leaveAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(PLAY_COOKIE);
  redirect("/play");
}
