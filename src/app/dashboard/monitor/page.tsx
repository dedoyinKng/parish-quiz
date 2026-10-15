import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { getCurrentSeason } from "@/lib/season";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import {
  STAGE_LABEL,
  canScheduleExams,
  STATUS_CLASS,
  STATUS_LABEL,
  examStatus,
  formatLagos,
} from "@/lib/exams";

export default async function MonitorIndexPage() {
  const user = await requireUser();
  if (!canScheduleExams(user.role)) redirect("/dashboard");

  const season = await getCurrentSeason();
  const units = await getVisibleUnits(user);

  const exams = season
    ? await db.exam.findMany({
        where: { seasonId: season.id, orgUnitId: { in: units.map((u) => u.id) } },
        include: { orgUnit: true },
        orderBy: { startsAt: "desc" },
      })
    : [];

  const ids = exams.map((e) => e.id);
  const [entered, submitted] = await Promise.all([
    db.attempt.groupBy({ by: ["examId"], where: { examId: { in: ids } }, _count: { _all: true } }),
    db.attempt.groupBy({
      by: ["examId"],
      where: { examId: { in: ids }, submittedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const enteredOf = (id: string) => entered.find((x) => x.examId === id)?._count._all ?? 0;
  const submittedOf = (id: string) => submitted.find((x) => x.examId === id)?._count._all ?? 0;
  const now = new Date();

  return (
    <div className="qwide">
      <div className="qhead">
        <div>
          <h1>Venue monitor</h1>
          <p className="muted">
            {season ? `Season ${season.name}` : "No season yet"} · Open a competition to see who is
            writing, add time, or reopen an attempt
          </p>
        </div>
      </div>

      <div className="exlist">
        <div className="exrow exhead">
          <span>Unit</span>
          <span>Quiz</span>
          <span>Date and time</span>
          <span>Entered</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>

        {exams.length === 0 && <p className="qempty">No competitions yet.</p>}

        {exams.map((e) => {
          const st = examStatus(e.startsAt, e.durationMinutes, now);
          return (
            <Link key={e.id} href={`/dashboard/monitor/${e.id}`} className="exrow">
              <span>
                <strong>{e.orgUnit.name}</strong>
                <br />
                <span className="muted">{STAGE_LABEL[e.orgUnit.type]} stage</span>
              </span>
              <span>
                {COMPETITION_LABEL[e.competition]}
                <br />
                <span className="muted">{LEVEL_LABEL[e.level]}</span>
              </span>
              <span>{formatLagos(e.startsAt)}</span>
              <span>{enteredOf(e.id)}</span>
              <span>{submittedOf(e.id)}</span>
              <span>
                <span className={`pill ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
