import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import { STAGE_LABEL, canScheduleExams, formatLagos } from "@/lib/exams";
import { getUnitResult } from "@/lib/qualify";
import { finalizeAttempt } from "@/lib/quiz-server";
import { extendAction, submitNowAction, clearLockAction } from "../actions";
import AutoRefresh from "../AutoRefresh";
import MonitorButton from "../MonitorButton";
import "../monitor.css";

function answeredCount(a: unknown): number {
  const o = (a ?? {}) as Record<string, unknown>;
  return Object.values(o).filter((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v as object).length > 0;
    return true;
  }).length;
}

function left(ms: number) {
  if (ms <= 0) return "0:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function MonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canScheduleExams(user.role)) redirect("/dashboard");

  const { id } = await params;
  const exam = await db.exam.findUnique({ where: { id }, include: { orgUnit: true } });
  const visible = await getVisibleUnits(user);
  if (!exam || !visible.some((u) => u.id === exam.orgUnitId)) notFound();

  // close any attempt whose time has run out
  const overdue = await db.attempt.findMany({
    where: { examId: id, submittedAt: null, endsAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const a of overdue) await finalizeAttempt(a.id);

  const now = new Date();
  const attempts = await db.attempt.findMany({
    where: { examId: id },
    include: { candidate: { select: { fullName: true, code: true } } },
    orderBy: { startedAt: "asc" },
  });

  // who is expected to take this competition
  const allUnits = await db.orgUnit.findMany({ select: { id: true, parentId: true } });
  const kids = new Map<string, string[]>();
  for (const u of allUnits) {
    if (u.parentId) kids.set(u.parentId, [...(kids.get(u.parentId) ?? []), u.id]);
  }
  const descendants = (root: string): string[] => {
    const out: string[] = [];
    const stack = [root];
    while (stack.length) {
      const cur = stack.pop()!;
      out.push(cur);
      for (const k of kids.get(cur) ?? []) stack.push(k);
    }
    return out;
  };

  const base = {
    seasonId: exam.seasonId,
    level: exam.level,
    status: { not: "WITHDRAWN" as const },
    entries: { some: { competition: exam.competition } },
  };
  let expected: { id: string; fullName: string; code: string }[] = [];
  const select = { id: true, fullName: true, code: true };

  if (exam.orgUnit.type === "PARISH") {
    expected = await db.candidate.findMany({
      where: { ...base, parishId: exam.orgUnitId },
      select,
      orderBy: { fullName: "asc" },
    });
  } else {
    // higher stages: the winners of the stage below
    const children = kids.get(exam.orgUnitId) ?? [];
    const results = await Promise.all(
      children.map((c) =>
        getUnitResult(
          exam.seasonId,
          c,
          exam.level,
          exam.competition === "SPELLING_BEE" ? "SPELLING_BEE" : "QUIZ"
        )
      )
    );
    const winnerIds = results.map((r) => r.winner?.candidateId).filter((x): x is string => !!x);
    expected = await db.candidate.findMany({
      where: { id: { in: winnerIds } },
      select,
      orderBy: { fullName: "asc" },
    });
  }

  const started = new Set(attempts.map((a) => a.candidateId));
  const notStarted = expected.filter((c) => !started.has(c.id));
  const writing = attempts.filter((a) => !a.submittedAt);
  const submitted = attempts.filter((a) => a.submittedAt);

  const blocks = await db.playThrottle.findMany({
    where: { blockedUntil: { gt: now } },
  });
  const locked = expected.filter((c) =>
    blocks.some((b) => b.key.toLowerCase().includes(c.code.toLowerCase()))
  );

  return (
    <div className="qwide">
      <AutoRefresh seconds={10} />
      <div className="qhead">
        <div>
          <h1>
            {COMPETITION_LABEL[exam.competition]} · {LEVEL_LABEL[exam.level]}
          </h1>
          <p className="muted">
            {exam.orgUnit.name} · {STAGE_LABEL[exam.orgUnit.type]} stage ·{" "}
            {formatLagos(exam.startsAt)} · {exam.durationMinutes} min ·{" "}
            <span className="mon-live">● updates every 10 seconds</span>
          </p>
        </div>
        <Link href="/dashboard/monitor" className="btn">
          All competitions
        </Link>
      </div>

      <div className="mon-chips">
        <div className="mon-chip">
          <b>{expected.length}</b>
          <span>Expected</span>
        </div>
        <div className="mon-chip">
          <b>{notStarted.length}</b>
          <span>Not started</span>
        </div>
        <div className="mon-chip">
          <b>{writing.length}</b>
          <span>Writing</span>
        </div>
        <div className="mon-chip">
          <b>{submitted.length}</b>
          <span>Submitted</span>
        </div>
      </div>

      {locked.length > 0 && (
        <div className="mon-card">
          <h2>Locked out ({locked.length})</h2>
          <div className="mon-note">
            These candidates entered a wrong PIN too many times. They can try again after a few
            minutes, or you can clear the lock now.
          </div>
          <div className="mon-scroll">
            <table className="mon-table">
              <tbody>
                {locked.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.fullName}</strong>
                    </td>
                    <td className="muted">{c.code}</td>
                    <td>
                      <form action={clearLockAction}>
                        <input type="hidden" name="examId" value={exam.id} />
                        <input type="hidden" name="candidateId" value={c.id} />
                        <MonitorButton label="Clear lock" />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mon-card">
        <h2>Candidates who have started ({attempts.length})</h2>
        {attempts.length === 0 ? (
          <div className="mon-note">Nobody has logged in yet.</div>
        ) : (
          <div className="mon-scroll">
            <table className="mon-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Answered</th>
                  <th>Time left</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const total = (a.questionIds as string[]).length;
                  const done = answeredCount(a.answers);
                  const isWriting = !a.submittedAt;
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.candidate.fullName}</strong>
                        <br />
                        <span className="muted">{a.candidate.code}</span>
                      </td>
                      <td>
                        <span className={`mon-pill ${isWriting ? "write" : "done"}`}>
                          {isWriting ? "Writing" : "Submitted"}
                        </span>
                      </td>
                      <td>
                        {done} / {total}
                      </td>
                      <td>{isWriting ? left(a.endsAt.getTime() - now.getTime()) : "–"}</td>
                      <td>
                        {a.submittedAt && a.score !== null ? `${a.score} / ${a.maxScore}` : "–"}
                      </td>
                      <td>
                        <div className="mon-acts">
                          {[5, 10].map((m) => (
                            <form action={extendAction} key={m}>
                              <input type="hidden" name="attemptId" value={a.id} />
                              <input type="hidden" name="minutes" value={m} />
                              <MonitorButton
                                label={isWriting ? `+${m} min` : `Reopen ${m} min`}
                                confirmText={
                                  isWriting
                                    ? undefined
                                    : `Reopen ${a.candidate.fullName}'s attempt for ${m} minutes? Their score will be cleared until they submit again.`
                                }
                              />
                            </form>
                          ))}
                          {isWriting && (
                            <form action={submitNowAction}>
                              <input type="hidden" name="attemptId" value={a.id} />
                              <MonitorButton
                                label="Submit now"
                                className="mon-btn warn"
                                confirmText={`Submit ${a.candidate.fullName}'s answers now?`}
                              />
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mon-note">
          After adding time or reopening, ask the candidate to refresh their page (or log in again)
          so their clock updates.
        </div>
      </div>

      <div className="mon-card">
        <h2>Not started ({notStarted.length})</h2>
        {notStarted.length === 0 ? (
          <div className="mon-note">Everyone expected has started.</div>
        ) : (
          <div className="mon-scroll">
            <table className="mon-table">
              <tbody>
                {notStarted.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.fullName}</strong>
                    </td>
                    <td className="muted">{c.code}</td>
                    <td>
                      <span className="mon-pill wait">Not started</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
