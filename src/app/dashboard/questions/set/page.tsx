import Link from "next/link";
import { redirect } from "next/navigation";
import type { Competition, Level } from "@prisma/client";
import { Plus } from "lucide-react";
import { db as prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { COMPETITION_LABEL, LEVELS, LEVEL_LABEL } from "@/lib/levels";
import {
  QUESTION_COMPETITIONS,
  QUESTION_TYPE_LABEL,
  canManageQuestions,
} from "@/lib/questions";

const plain = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");

export default async function QuestionSetPage({
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

  const questions = await prisma.question.findMany({
    where: {
      seasonId: season.id,
      competition: competition as Competition,
      level: level as Level,
    },
    orderBy: { createdAt: "asc" },
  });

  const compLabel = COMPETITION_LABEL[competition as keyof typeof COMPETITION_LABEL];
  const levelLabel = LEVEL_LABEL[level as keyof typeof LEVEL_LABEL];

  return (
    <div className="qwide">
      <div className="crumbs">
        <Link href={`/dashboard/questions?season=${season.id}`}>Question bank</Link>
        <span>/</span>
        <span>{compLabel}</span>
        <span>/</span>
        <span>{levelLabel}</span>
      </div>

      <div className="qhead">
        <h1>
          {compLabel} · {levelLabel} · {season.name}
        </h1>
        <Link
          href={`/dashboard/questions/new?season=${season.id}&competition=${competition}&level=${level}`}
          className="btn btn-primary"
        >
          <Plus size={16} /> Add questions
        </Link>
      </div>

      <div className="qlist">
        {questions.length === 0 ? (
          <p className="qempty">No questions in this set yet. Click Add questions to start.</p>
        ) : (
          questions.map((q, i) => (
            <div key={q.id} className="qitem">
              <span className="numdot">{i + 1}</span>
              <span className="qitem-text">{plain(q.prompt)}</span>
              <span className="pill">{QUESTION_TYPE_LABEL[q.type]}</span>
              <Link href={`/dashboard/questions/${q.id}`} className="linkbtn">
                Edit
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}