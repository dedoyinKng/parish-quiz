import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db as prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import { canManageQuestions, type QuestionContent } from "@/lib/questions";
import QuestionForm from "../QuestionForm";
import { updateQuestionAction, deleteQuestionAction } from "../actions";
import DeleteQuestionButton from "./DeleteQuestionButton";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canManageQuestions(user.role)) redirect("/dashboard");

  const { id } = await params;
  const q = await prisma.question.findUnique({ where: { id }, include: { season: true } });
  if (!q || !q.season) notFound();

  const compLabel = COMPETITION_LABEL[q.competition as keyof typeof COMPETITION_LABEL];
  const levelLabel = LEVEL_LABEL[q.level as keyof typeof LEVEL_LABEL];

  return (
    <div className="qwide">
      <div className="crumbs">
        <Link href={`/dashboard/questions?season=${q.season.id}`}>Question bank</Link>
        <span>/</span>
        <Link
          href={`/dashboard/questions/set?season=${q.season.id}&competition=${q.competition}&level=${q.level}`}
        >
          {compLabel} · {levelLabel}
        </Link>
        <span>/</span>
        <span>Edit question</span>
      </div>

      <QuestionForm
        action={updateQuestionAction.bind(null, q.id)}
        set={{
          seasonId: q.season.id,
          seasonName: q.season.name,
          competition: q.competition,
          level: q.level,
        }}
        initial={{
          type: q.type,
          prompt: q.prompt,
          marks: q.marks,
          explanation: q.explanation ?? "",
          content: q.content as QuestionContent,
        }}
        submitLabel="Save changes"
      />

      <DeleteQuestionButton action={deleteQuestionAction.bind(null, q.id)} />
    </div>
  );
}