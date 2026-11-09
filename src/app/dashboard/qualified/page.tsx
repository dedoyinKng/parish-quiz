import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/levels";
import { STAGE_LABEL } from "@/lib/exams";
import { getUnitResult, type Track } from "@/lib/qualify";
import { decideTieAction, undoTieAction } from "./actions";
import "./qualified.css";

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function QualifiedPage() {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") redirect("/dashboard");

  const season = await getCurrentSeason();
  const units = await getVisibleUnits(user);

  const exams = season
    ? await db.exam.findMany({
        where: {
          seasonId: season.id,
          orgUnitId: { in: units.map((u) => u.id) },
          competition: { in: ["ZEAL_QUIZ", "BIBLE_QUIZ", "SPELLING_BEE"] },
        },
        include: { orgUnit: { include: { parent: true } } },
        orderBy: { startsAt: "asc" },
      })
    : [];

  // one group per unit + category + track
  const groups = new Map<
    string,
    {
      unitId: string;
      unitName: string;
      type: string;
      next: string;
      level: string;
      track: Track;
    }
  >();
  for (const e of exams) {
    const track: Track = String(e.competition) === "SPELLING_BEE" ? "SPELLING_BEE" : "QUIZ";
    const key = `${e.orgUnitId}|${e.level}|${track}`;
    if (!groups.has(key)) {
      groups.set(key, {
        unitId: e.orgUnitId,
        unitName: e.orgUnit.name,
        type: e.orgUnit.type,
        next: e.orgUnit.parent?.name ?? "the next stage",
        level: e.level,
        track,
      });
    }
  }

  const results = await Promise.all(
    [...groups.values()].map(async (g) => ({
      g,
      r: await getUnitResult(season!.id, g.unitId, g.level, g.track),
    }))
  );

  const candIds = [...new Set(results.flatMap((x) => x.r.ranked.map((c) => c.candidateId)))];
  const cands = candIds.length
    ? await db.candidate.findMany({
        where: { id: { in: candIds } },
        select: { id: true, fullName: true, code: true },
      })
    : [];
  const cOf = new Map(cands.map((c) => [c.id, c]));
  const seasonId = season?.id ?? "";

  return (
    <div className="qwide">
      <div className="qhead">
        <div>
          <h1>Qualifiers</h1>
          <p className="muted">
            {season ? `Season ${season.name}` : "No season yet"} · Zeal Quiz and Bible Quiz
            scores are added together. Spelling Bee is ranked on its own. Only the first
            place in each category proceeds.
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <a href="/dashboard/qualified/export" className="btn">
            Download all (CSV)
          </a>
          <a href="/dashboard/qualified/export?stage=PROVINCE" className="btn">
            Province only (CSV)
          </a>
          <Link href="/dashboard/results" className="btn">
            Back to results
          </Link>
        </div>
      </div>

      {results.length === 0 && (
        <p className="qempty">No competitions yet, so there are no qualifiers.</p>
      )}

      {results.map(({ g, r }) => {
        const isSpell = g.track === "SPELLING_BEE";
        return (
          <div className="qgroup" key={`${g.unitId}|${g.level}|${g.track}`}>
            <div className="qgroup-head">
              <h2>
                {g.unitName} · {LEVEL_LABEL[g.level as keyof typeof LEVEL_LABEL]} ·{" "}
                {isSpell ? "Spelling Bee" : "Zeal + Bible"}
              </h2>
              <span className="muted">
                {STAGE_LABEL[g.type as keyof typeof STAGE_LABEL]} stage
                {!isSpell && !r.hasZeal && " · no Zeal competition"}
                {!isSpell && !r.hasBible && " · no Bible competition"}
              </span>
            </div>

            {r.ranked.length === 0 ? (
              <div className="qnote muted">No submitted attempts yet.</div>
            ) : (
              <div className="qscroll">
                <table className="qtable">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Candidate</th>
                      {!isSpell && <th className="num">Zeal</th>}
                      {!isSpell && <th className="num">Bible</th>}
                      <th className="num">{isSpell ? "Score" : "Total"}</th>
                      <th className="num">Time</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.ranked.map((c, i) => {
                      const cand = cOf.get(c.candidateId);
                      const isWin = r.winner?.candidateId === c.candidateId;
                      const isTie = r.tied.some((t) => t.candidateId === c.candidateId);
                      return (
                        <tr key={c.candidateId} className={isWin ? "qwin" : ""}>
                          <td>{i + 1}</td>
                          <td>
                            <strong>{cand?.fullName ?? "Unknown"}</strong>
                            <br />
                            <span className="muted">{cand?.code}</span>
                          </td>
                          {!isSpell && <td className="num">{c.zeal ?? "–"}</td>}
                          {!isSpell && <td className="num">{c.bible ?? "–"}</td>}
                          <td className="num">
                            <strong>{c.total}</strong>
                            <span className="muted"> / {c.maxTotal}</span>
                          </td>
                          <td className="num">{mmss(c.seconds)}</td>
                          <td>
                            {isWin && <span className="qpill go">Proceeds</span>}
                            {isTie && <span className="qpill tie">Tied for 1st</span>}
                            {!c.complete && <span className="qpill miss">Missing a quiz</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {r.winner && (
              <div className="qnote">
                <strong>{cOf.get(r.winner.candidateId)?.fullName}</strong> proceeds from{" "}
                {g.unitName}
                {g.type === "PROVINCE" ? " as a province qualifier." : ` to ${g.next}.`}
                {r.decided && (
                  <>
                    {" "}
                    <span className="muted">Chosen by a coordinator after a tie.</span>
                    <div className="qtie-form">
                      <form action={undoTieAction}>
                        <input type="hidden" name="seasonId" value={seasonId} />
                        <input type="hidden" name="orgUnitId" value={g.unitId} />
                        <input type="hidden" name="level" value={g.level} />
                        <input type="hidden" name="track" value={g.track} />
                        <button type="submit" className="btn">
                          Undo decision
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}

            {r.tied.length > 1 && (
              <div className="qnote tie">
                {r.tied.length} candidates are equal for first place on score and time.
                Choose who proceeds:
                <div className="qtie-form">
                  {r.tied.map((t) => (
                    <form action={decideTieAction} key={t.candidateId}>
                      <input type="hidden" name="seasonId" value={seasonId} />
                      <input type="hidden" name="orgUnitId" value={g.unitId} />
                      <input type="hidden" name="level" value={g.level} />
                      <input type="hidden" name="track" value={g.track} />
                      <input type="hidden" name="candidateId" value={t.candidateId} />
                      <button type="submit" className="btn">
                        {cOf.get(t.candidateId)?.fullName ?? "Candidate"} proceeds
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
