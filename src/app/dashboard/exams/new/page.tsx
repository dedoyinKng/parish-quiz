import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { canScheduleExams } from "@/lib/exams";
import ExamForm from "../ExamForm";
import { createExamAction } from "../actions";

export default async function NewExamPage() {
  const user = await requireUser();
  if (!canScheduleExams(user.role)) redirect("/dashboard/exams");

  const season = await getCurrentSeason();
  const units = (await getVisibleUnits(user)).map((u) => ({
    id: u.id,
    name: u.name,
    type: u.type,
  }));

  return (
    <div className="qwide">
      <div className="crumbs">
        <Link href="/dashboard/exams">Competitions</Link>
        <span>/</span>
        <span>Schedule competition</span>
      </div>

      {!season ? (
        <p className="qempty">There is no season yet.</p>
      ) : units.length === 0 ? (
        <p className="qempty">There are no units yet, so you cannot schedule an exam.</p>
      ) : (
        <ExamForm action={createExamAction} units={units} submitLabel="Schedule competition" />
      )}
    </div>
  );
}
