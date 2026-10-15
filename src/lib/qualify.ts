import { db } from "@/lib/db";

export type Combined = {
  candidateId: string;
  zeal: number | null;
  bible: number | null;
  total: number;
  maxTotal: number;
  seconds: number;
  /** Submitted both Zeal Quiz and Bible Quiz. */
  complete: boolean;
};

export type UnitResult = {
  ranked: Combined[];
  winner: Combined | null;
  /** Equal for 1st on total and time and not yet decided. */
  tied: Combined[];
  /** The winner was chosen by a coordinator after a tie. */
  decided: boolean;
  hasZeal: boolean;
  hasBible: boolean;
};

/**
 * Combined Zeal + Bible ranking for one category at one unit.
 * Only candidates with BOTH quizzes submitted are eligible.
 */
export async function getUnitResult(
  seasonId: string,
  orgUnitId: string,
  level: string
): Promise<UnitResult> {
  const exams = await db.exam.findMany({
    where: {
      seasonId,
      orgUnitId,
      level: level as never,
      competition: { in: ["ZEAL_QUIZ", "BIBLE_QUIZ"] as never[] },
    },
    select: { id: true, competition: true },
  });

  const zealId = exams.find((e) => String(e.competition) === "ZEAL_QUIZ")?.id;
  const bibleId = exams.find((e) => String(e.competition) === "BIBLE_QUIZ")?.id;

  const attempts = exams.length
    ? await db.attempt.findMany({
        where: {
          examId: { in: exams.map((e) => e.id) },
          submittedAt: { not: null },
          score: { not: null },
        },
        select: {
          examId: true,
          candidateId: true,
          score: true,
          maxScore: true,
          startedAt: true,
          submittedAt: true,
        },
      })
    : [];

  const map = new Map<string, Combined>();
  for (const a of attempts) {
    const c =
      map.get(a.candidateId) ??
      ({
        candidateId: a.candidateId,
        zeal: null,
        bible: null,
        total: 0,
        maxTotal: 0,
        seconds: 0,
        complete: false,
      } as Combined);
    const secs = Math.max(
      0,
      Math.round((a.submittedAt!.getTime() - a.startedAt.getTime()) / 1000)
    );
    if (a.examId === zealId) c.zeal = a.score ?? 0;
    if (a.examId === bibleId) c.bible = a.score ?? 0;
    c.total += a.score ?? 0;
    c.maxTotal += a.maxScore ?? 0;
    c.seconds += secs;
    map.set(a.candidateId, c);
  }

  const all = [...map.values()].map((c) => ({
    ...c,
    complete: c.zeal !== null && c.bible !== null,
  }));

  // Eligible (both quizzes) first, then by total desc, then faster time.
  const ranked = all.sort(
    (x, y) =>
      Number(y.complete) - Number(x.complete) ||
      y.total - x.total ||
      x.seconds - y.seconds
  );

  const first = ranked[0];
  const eligible = !!first && first.complete;
  const tiedList = eligible
    ? ranked.filter(
        (p) =>
          p.complete && p.total === first.total && p.seconds === first.seconds
      )
    : [];

  let winner: Combined | null = null;
  let tied: Combined[] = [];
  let decided = false;

  if (eligible && tiedList.length === 1) {
    winner = first;
  } else if (tiedList.length > 1) {
    const o = await db.qualifierOverride.findUnique({
      where: { seasonId_orgUnitId_level: { seasonId, orgUnitId, level: level as never } },
    });
    const chosen = o
      ? tiedList.find((c) => c.candidateId === o.candidateId)
      : undefined;
    if (chosen) {
      winner = chosen;
      decided = true;
    } else {
      tied = tiedList;
    }
  }

  return {
    ranked,
    winner,
    tied,
    decided,
    hasZeal: !!zealId,
    hasBible: !!bibleId,
  };
}

export type GateResult = { ok: true } | { ok: false; reason: "NOT_WINNER" | "UNDECIDED" };

/**
 * Can this candidate enter a quiz held at examUnitId?
 * - Their own parish: always yes.
 * - Any higher unit: they must have won (combined Zeal + Bible)
 *   at the unit directly below it on their path up.
 */
export async function checkQualified(opts: {
  candidateId: string;
  parishId: string;
  seasonId: string;
  level: string;
  examUnitId: string;
  parentOf: Map<string, string | null>;
}): Promise<GateResult> {
  const { candidateId, parishId, seasonId, level, examUnitId, parentOf } = opts;
  if (parishId === examUnitId) return { ok: true };

  let child: string = parishId;
  const seen = new Set<string>();
  while (!seen.has(child)) {
    seen.add(child);
    const up = parentOf.get(child) ?? null;
    if (!up) return { ok: false, reason: "NOT_WINNER" };
    if (up === examUnitId) break;
    child = up;
  }

  const res = await getUnitResult(seasonId, child, level);
  if (res.winner?.candidateId === candidateId) return { ok: true };
  if (res.tied.some((t) => t.candidateId === candidateId))
    return { ok: false, reason: "UNDECIDED" };
  return { ok: false, reason: "NOT_WINNER" };
}
