import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import { STAGE_LABEL, formatLagos } from "@/lib/exams";
import { finalizeAttempt } from "@/lib/quiz-server";

const fmtSecs = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default async function ResultsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") redirect("/dashboard");

  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { orgUnit: true, season: true },
  });
  if (!exam) notFound();

  const visible = await getVisibleUnits(user);
  if (!visible.some((u) => u.id === exam.orgUnitId)) notFound();

  // close any attempt whose time ran out, so every score is in
  const overdue = await db.attempt.findMany({
    where: { examId: id, submittedAt: null, endsAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const o of overdue) await finalizeAttempt(o.id);

  const attempts = await db.attempt.findMany({
    where: { examId: id },
    include: { candidate: { include: { parish: true } } },
  });

  // candidates who should be here: registered for this quiz and category under this unit
  const allUnits = await db.orgUnit.findMany({
    select: { id: true, parentId: true, type: true },
  });
  const kids = new Map<string, string[]>();
  for (const u of allUnits) {
    if (u.parentId) kids.set(u.parentId, [...(kids.get(u.parentId) ?? []), u.id]);
  }
  const typeOf = new Map(allUnits.map((u) => [u.id, u.type]));
  const parishIds: string[] = [];
  const stack = [exam.orgUnitId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (typeOf.get(cur) === "PARISH") parishIds.push(cur);
    stack.push(...(kids.get(cur) ?? []));
  }
  const expected = await db.candidate.count({
    where: {
      seasonId: exam.seasonId,
      level: exam.level,
      parishId: { in: parishIds },
      status: { not: "WITHDRAWN" },
      entries: { some: { competition: exam.competition } },
    },
  });

  // leaderboard: higher score first, then the faster finisher
  const done = attempts
    .filter((a) => a.submittedAt)
    .map((a) => ({
      a,
      secs: Math.max(0, Math.round((a.submittedAt!.getTime() - a.startedAt.getTime()) / 1000)),
      rank: 0,
    }))
    .sort((x, y) => (y.a.score ?? 0) - (x.a.score ?? 0) || x.secs - y.secs);

  done.forEach((r, i) => {
    const prev = done[i - 1];
    r.rank =
      prev && prev.a.score === r.a.score && prev.secs === r.secs ? prev.rank : i + 1;
  });

  const writing = attempts.filter((a) => !a.submittedAt);
  const absent = Math.max(0, expected - attempts.length);

  return (
    <div className="qwide">
      <div className="crumbs">
        <Link href="/dashboard/results">Results</Link>
        <span>/</span>
        <span>
          {exam.orgUnit.name} · {COMPETITION_LABEL[exam.competition]} · {LEVEL_LABEL[exam.level]}
        </span>
      </div>

      <div className="qhead">
        <div>
          <h1>
            {exam.orgUnit.name} · {COMPETITION_LABEL[exam.competition]} · {LEVEL_LABEL[exam.level]}
          </h1>
          <p className="muted">
            {STAGE_LABEL[exam.orgUnit.type]} stage · {exam.season.name} · {formatLagos(exam.startsAt)}
          </p>
        </div>
      </div>

      <div className="setbar">
        <div className="setbar-left">
          <span className="setchip">{expected} registered</span>
          <span className="setchip">{attempts.length} entered</span>
          <span className="setchip">{done.length} submitted</span>
          {writing.length > 0 && <span className="setchip">{writing.length} still writing</span>}
          {absent > 0 && <span className="setchip">{absent} absent</span>}
        </div>
      </div>

      <div className="exlist">
        <div className="lbrow exhead">
          <span>Rank</span>
          <span>Candidate</span>
          <span>Parish</span>
          <span>Score</span>
          <span>Percent</span>
          <span>Time</span>
        </div>

        {done.length === 0 && (
          <p className="qempty">No submitted answers yet.</p>
        )}

        {done.map((r) => {
          const max = r.a.maxScore ?? 0;
          const pct = max ? Math.round(((r.a.score ?? 0) / max) * 1000) / 10 : 0;
          return (
            <div key={r.a.id} className="lbrow">
              <span className={`rankbadge${r.rank <= 3 ? ` rank-${r.rank}` : ""}`}>{r.rank}</span>
              <span>
                <strong>{r.a.candidate.fullName}</strong>
                <br />
                <span className="muted mono">{r.a.candidate.code}</span>
              </span>
              <span>{r.a.candidate.parish.name}</span>
              <span>
                <strong>{r.a.score ?? 0}</strong> / {max}
              </span>
              <span>{pct}%</span>
              <span className="mono">{fmtSecs(r.secs)}</span>
            </div>
          );
        })}
      </div>

      {writing.length > 0 && (
        <div className="qcard" style={{ marginTop: "1.25rem" }}>
          <h2>Still writing</h2>
          <p className="sub">These candidates have not submitted yet. They are scored automatically when their time ends.</p>
          {writing.map((a) => (
            <div key={a.id} className="mrow">
              <strong>{a.candidate.fullName}</strong>
              <span className="muted mono">{a.candidate.code}</span>
              <span className="muted">{a.candidate.parish.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
