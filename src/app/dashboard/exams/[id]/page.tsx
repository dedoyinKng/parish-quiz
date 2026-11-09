import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import {
  STAGE_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  canScheduleExams,
  examStatus,
  formatLagos,
  toLagosInput,
} from "@/lib/exams";
import ExamForm from "../ExamForm";
import ConfirmButton from "../ConfirmButton";
import {
  updateExamAction,
  regeneratePinAction,
  deleteExamAction,
} from "../actions";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") redirect("/dashboard");
  const canEdit = canScheduleExams(user.role);

  const { id } = await params;
  const exam = await db.exam.findUnique({
    where: { id },
    include: { orgUnit: true, season: true },
  });
  if (!exam) notFound();

  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === exam.orgUnitId)) notFound();

  const available = await db.question.count({
    where: {
      seasonId: exam.seasonId,
      competition: exam.competition,
      level: exam.level,
      active: true,
    },
  });

  const st = examStatus(exam.startsAt, exam.durationMinutes);
  const unitLabel = `${STAGE_LABEL[exam.orgUnit.type]}: ${exam.orgUnit.name}`;

  return (
    <div className="qwide">
      <div className="crumbs">
        <Link href="/dashboard/exams">Competitions</Link>
        <span>/</span>
        <span>
          {exam.orgUnit.name} · {COMPETITION_LABEL[exam.competition]} ·{" "}
          {LEVEL_LABEL[exam.level]}
        </span>
      </div>

      <div className="qcard">
        <h2>General session PIN</h2>
        <p className="sub">
          Give this PIN to the candidates at the venue. They log in with their candidate ID and
          this PIN once the exam opens. Coordinators above this unit can see it too.
        </p>
        <div className="pinbox">{exam.pin}</div>

        <div className="facts-grid">
          <div>
            <div className="fact-label">Unit</div>
            <div className="fact-value">{unitLabel}</div>
          </div>
          <div>
            <div className="fact-label">Status</div>
            <div className="fact-value">
              <span className={`pill ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
            </div>
          </div>
          <div>
            <div className="fact-label">Quiz and category</div>
            <div className="fact-value">
              {COMPETITION_LABEL[exam.competition]} · {LEVEL_LABEL[exam.level]} · {exam.season.name}
            </div>
          </div>
          <div>
            <div className="fact-label">Starts (West Africa Time)</div>
            <div className="fact-value">{formatLagos(exam.startsAt)}</div>
          </div>
          <div>
            <div className="fact-label">Questions</div>
            <div className="fact-value">
              {exam.questionCount ?? available} of {available} in the bank
            </div>
          </div>
          <div>
            <div className="fact-label">Duration</div>
            <div className="fact-value">{exam.durationMinutes} minutes</div>
          </div>
        </div>

        {canEdit ? (
          <div className="action-row">
            <ConfirmButton
              action={regeneratePinAction.bind(null, exam.id)}
              label="Generate a new PIN"
              confirmText="Generate a new PIN? The old PIN will stop working."
            />
            <ConfirmButton
              action={deleteExamAction.bind(null, exam.id)}
              label="Delete competition"
              confirmText="Delete this competition? This cannot be undone."
              danger
            />
          </div>
        ) : (
          <p className="muted" style={{ marginTop: "1.25rem" }}>
            Only a coordinator can change this competition&apos;s schedule or PIN.
          </p>
        )}
      </div>

      {canEdit && (
        <ExamForm
          action={updateExamAction.bind(null, exam.id)}
          units={[]}
          initial={{
            unitLabel,
            competition: exam.competition,
            level: exam.level,
            startsAt: toLagosInput(exam.startsAt),
            durationMinutes: exam.durationMinutes,
            questionCount: exam.questionCount,
          }}
          submitLabel="Save changes"
        />
      )}
    </div>
  );
}
