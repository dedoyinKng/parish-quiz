import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import {
  STAGE_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  canScheduleExams,
  examStatus,
  formatLagos,
} from "@/lib/exams";

export default async function ExamsPage() {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") redirect("/dashboard");
  const canSchedule = canScheduleExams(user.role);

  const season = await getCurrentSeason();
  const units = await getVisibleUnits(user);

  const exams = season
    ? await db.exam.findMany({
        where: { seasonId: season.id, orgUnitId: { in: units.map((u) => u.id) } },
        include: { orgUnit: true },
        orderBy: { startsAt: "asc" },
      })
    : [];

  const now = new Date();

  return (
    <div className="qwide">
      <div className="qhead">
        <div>
          <h1>Competitions</h1>
          <p className="muted">
            {season ? `Season ${season.name}` : "No season yet"} · {exams.length} scheduled
          </p>
        </div>
        {canSchedule && (
          <Link href="/dashboard/exams/new" className="btn btn-primary">
            <Plus size={16} /> Schedule competition
          </Link>
        )}
      </div>

      <div className="exlist">
        <div className="exrow exhead">
          <span>Unit</span>
          <span>Quiz</span>
          <span>Date and time</span>
          <span>Duration</span>
          <span>PIN</span>
          <span>Status</span>
        </div>

        {exams.length === 0 && (
          <p className="qempty">
            {canSchedule
              ? "No competitions scheduled yet. Click Schedule competition to create one."
              : "No competitions scheduled for you yet. A coordinator schedules the competitions and they will appear here with their PIN."}
          </p>
        )}

        {exams.map((e) => {
          const st = examStatus(e.startsAt, e.durationMinutes, now);
          return (
            <Link key={e.id} href={`/dashboard/exams/${e.id}`} className="exrow">
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
              <span>{e.durationMinutes} min</span>
              <span className="mono">{e.pin}</span>
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
