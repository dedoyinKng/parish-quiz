import Link from "next/link";
import { redirect } from "next/navigation";
import { db as prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { seasonNameFor } from "@/lib/season";
import { COMPETITION_LABEL, LEVELS, LEVEL_LABEL } from "@/lib/levels";
import { QUESTION_COMPETITIONS, canManageQuestions } from "@/lib/questions";

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const user = await requireUser();
  if (!canManageQuestions(user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const seasons = await prisma.season.findMany({ orderBy: { createdAt: "desc" } });
  const current = seasons.find((s) => s.id === sp.season) ?? seasons.find((s) => s.name === seasonNameFor()) ?? seasons[0];

  if (!current) {
    return (
      <div className="qwide">
        <div className="qhead">
          <h1>Question bank</h1>
        </div>
        <p className="qempty">No season exists yet.</p>
      </div>
    );
  }

  const [groups, wordGroups] = await Promise.all([
    prisma.question.groupBy({
      by: ["competition", "level"],
      where: { seasonId: current.id },
      _count: { _all: true },
    }),
    prisma.spellingWord.groupBy({
      by: ["level"],
      where: { seasonId: current.id },
      _count: { _all: true },
    }),
  ]);
  const countFor = (competition: string, level: string) =>
    groups.find((g) => g.competition === competition && g.level === level)?._count._all ?? 0;
  const wordsFor = (level: string) =>
    wordGroups.find((g) => g.level === level)?._count._all ?? 0;

  return (
    <div className="qwide">
      <div className="qhead">
        <h1>Question bank</h1>
        <div className="seasons">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/questions?season=${s.id}`}
              className={`seasonpill${s.id === current.id ? " on" : ""}`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>

      {QUESTION_COMPETITIONS.map((comp) => (
        <div key={comp} className="qcard">
          <h2>{COMPETITION_LABEL[comp]}</h2>
          <p className="sub">Season {current.name}. Choose a category to see or add its questions.</p>
          <div className="catgrid">
            {LEVELS.map((lvl) => (
              <Link
                key={lvl}
                className="cattile"
                href={`/dashboard/questions/set?season=${current.id}&competition=${comp}&level=${lvl}`}
              >
                <strong>{LEVEL_LABEL[lvl]}</strong>
                <span>
                  {countFor(comp, lvl)} question{countFor(comp, lvl) === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="qcard">
        <h2>{COMPETITION_LABEL["SPELLING_BEE"]}</h2>
        <p className="sub">
          Season {current.name}. Choose a category to see or add its words and their audio.
        </p>
        <div className="catgrid">
          {LEVELS.map((lvl) => (
            <Link
              key={lvl}
              className="cattile"
              href={`/dashboard/spelling?season=${current.id}&level=${lvl}`}
            >
              <strong>{LEVEL_LABEL[lvl]}</strong>
              <span>
                {wordsFor(lvl)} word{wordsFor(lvl) === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
