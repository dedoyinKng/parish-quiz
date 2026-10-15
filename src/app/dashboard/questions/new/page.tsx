import Link from "next/link";
import { redirect } from "next/navigation";
import { db as prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { COMPETITION_LABEL, LEVELS, LEVEL_LABEL } from "@/lib/levels";
import {
  QUESTION_COMPETITIONS,
  canManageQuestions,
} from "@/lib/questions";
import QuestionForm from "../QuestionForm";
import { createQuestionAction } from "../actions";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; competition?: string; level?: string }>;
}) {
  const user = await requireUser();
  if (!canManageQuestions(user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const competition = sp.competition ?? "";
  const level = sp.level ?? "";
  if (
    !(QUESTION_COMPETITIONS as readonly string[]).includes(competition) ||
    !(LEVELS as readonly string[]).includes(level) ||
    !sp.season
  )
    redirect("/dashboard/questions");

  const season = await prisma.season.findUnique({ where: { id: sp.season } });
  if (!season) redirect("/dashboard/questions");

  const compLabel = COMPETITION_LABEL[competition as keyof typeof COMPETITION_LABEL];
  const levelLabel = LEVEL_LABEL[level as keyof typeof LEVEL_LABEL];

  return (
    <div className="qwide">
      <div className="crumbs">
        <Link href={`/dashboard/questions?season=${season.id}`}>Question bank</Link>
        <span>/</span>
        <Link
          href={`/dashboard/questions/set?season=${season.id}&competition=${competition}&level=${level}`}
        >
          {compLabel} · {levelLabel}
        </Link>
        <span>/</span>
        <span>Add questions</span>
      </div>

      <QuestionForm
        action={createQuestionAction}
        set={{ seasonId: season.id, seasonName: season.name, competition, level }}
        submitLabel="Save question"
      />
    </div>
  );
}