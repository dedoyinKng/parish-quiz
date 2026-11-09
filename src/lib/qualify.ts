import { db } from "@/lib/db";

export type Track = "QUIZ" | "SPELLING_BEE";

export type Combined = {
  candidateId: string;
  zeal: number | null;
  bible: number | null;
  total: number;
  maxTotal: number;
  seconds: number;
  /** QUIZ: submitted both Zeal and Bible. SPELLING_BEE: always true. */
  complete: boolean;
};

export type UnitResult = {
  ranked: Combined[];
  winner: Combined | null;
  tied: Combined[];
  decided: boolean;
  hasZeal: boolean;
  hasBible: boolean;
  hasSpelling: boolean;
};

/**
 * Ranking for one category at one unit.
 * QUIZ: Zeal + Bible added together (both required).
 * SPELLING_BEE: the Spelling Bee score on its own.
 * Highest score first; faster time breaks a tie; a coordinator decides a full tie.
 */
export async function getUnitResult(
  seasonId: string,
  orgUnitId: string,
  level: string,
  track: Track = "QUIZ"
): Promise<UnitResult> {
  const competitions =
    track === "QUIZ" ? ["ZEAL_QUIZ", "BIBLE_QUIZ"] : ["SPELLING_BEE"];

  const exams = await db.exam.findMany({
    where: {
      seasonId,
      orgUnitId,
      level: level as never,
      competition: { in: competitions as never[] },
    },
    select: { id: true, competition: true },
  });

  const zealId = exams.find((e) => String(e.competition) === "ZEAL_QUIZ")?.id;
  const bibleId = exams.find((e) => String(e.competition) === "BIBLE_QUIZ")?.id;
  const spellIds = exams
    .filter((e) => String(e.competition) === "SPELLING_BEE")
    .map((e) => e.id);

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
    complete: track === "QUIZ" ? c.zeal !== null && c.bible !== null : true,
  }));

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
      where: {
        seasonId_orgUnitId_level_track: {
          seasonId,
          orgUnitId,
          level: level as never,
          track,
        },
      },
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
    hasSpelling: spellIds.length > 0,
  };
}

export type GateResult =
  | { ok: true }
  | { ok: false; reason: "NOT_WINNER" | "UNDECIDED" };

/**
 * Can this candidate enter a competition held at examUnitId?
 * - Their own parish: always yes.
 * - Any higher unit: they must have won, on the same track, at the unit
 *   directly below it on their path up.
 */
export async function checkQualified(opts: {
  candidateId: string;
  parishId: string;
  seasonId: string;
  level: string;
  examUnitId: string;
  parentOf: Map<string, string | null>;
  track?: Track;
}): Promise<GateResult> {
  const { candidateId, parishId, seasonId, level, examUnitId, parentOf } = opts;
  const track = opts.track ?? "QUIZ";
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

  const res = await getUnitResult(seasonId, child, level, track);
  if (res.winner?.candidateId === candidateId) return { ok: true };
  if (res.tied.some((t) => t.candidateId === candidateId))
    return { ok: false, reason: "UNDECIDED" };
  return { ok: false, reason: "NOT_WINNER" };
}
