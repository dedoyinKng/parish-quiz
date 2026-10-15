import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";
import { PLAY_COOKIE } from "@/lib/exams";
import { toPlayQuestion } from "@/lib/quiz";
import { finalizeAttempt } from "@/lib/quiz-server";
import { leaveAction } from "../actions";
import QuizRunner from "./QuizRunner";
import SpellingRunner from "./SpellingRunner";

export default async function QuizPage() {
  const token = (await cookies()).get(PLAY_COOKIE)?.value;
  if (!token) redirect("/play");

  let attempt = await db.attempt.findUnique({
    where: { token },
    include: { candidate: true, exam: true },
  });
  if (!attempt) redirect("/play");

  const now = new Date();

  // time ran out while they were away: mark it now
  if (!attempt.submittedAt && now >= attempt.endsAt) {
    await finalizeAttempt(attempt.id);
    attempt = await db.attempt.findUnique({
      where: { token },
      include: { candidate: true, exam: true },
    });
    if (!attempt) redirect("/play");
  }

  const title = `${COMPETITION_LABEL[attempt.exam.competition]} · ${LEVEL_LABEL[attempt.exam.level]}`;

  if (attempt.submittedAt) {
    return (
      <div className="play-wrap">
        <div className="play-card">
          <p className="play-brand">{title}</p>
          <h1 className="play-title">{attempt.candidate.fullName}</h1>
          <div className="waitbox">
            <strong>Quiz submitted</strong>
            <span>Thank you. Your teacher will share the results.</span>
          </div>
          <form action={leaveAction}>
            <button type="submit" className="btn-ghost">
              Done
            </button>
          </form>
        </div>
      </div>
    );
  }

  const ids = attempt.questionIds as string[];

  // Spelling Bee: the candidate gets the audio and the hint, never the word itself
  if (attempt.exam.competition === "SPELLING_BEE") {
    const rows = await db.spellingWord.findMany({
      where: { id: { in: ids } },
      select: { id: true, hint: true },
    });
    const byWord = new Map(rows.map((r) => [r.id, r]));
    const words = ids
      .map((id) => byWord.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({ id: r.id, hint: r.hint }));

    return (
      <div className="play-wrap top">
        <SpellingRunner
          title={title}
          name={attempt.candidate.fullName}
          code={attempt.candidate.code}
          words={words}
          initialAnswers={(attempt.answers ?? {}) as Record<string, unknown>}
          endsAt={attempt.endsAt.toISOString()}
          serverNow={now.toISOString()}
        />
      </div>
    );
  }

  const rows = await db.question.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((q) => [q.id, q]));
  const questions = ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => toPlayQuestion(q, attempt!.id));

  return (
    <div className="play-wrap top">
      <QuizRunner
        title={title}
        name={attempt.candidate.fullName}
        code={attempt.candidate.code}
        questions={questions}
        initialAnswers={(attempt.answers ?? {}) as Record<string, unknown>}
        endsAt={attempt.endsAt.toISOString()}
        serverNow={now.toISOString()}
      />
    </div>
  );
}
