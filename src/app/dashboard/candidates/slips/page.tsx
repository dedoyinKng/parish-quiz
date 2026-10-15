import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Level } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { getCurrentSeason } from "@/lib/season";
import { COMPETITIONS, COMPETITION_LABEL, LEVELS, LEVEL_LABEL } from "@/lib/levels";
import PrintButton from "./PrintButton";
import "./slips.css";

export default async function SlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ parish?: string; level?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") redirect("/dashboard");

  const sp = await searchParams;
  const season = await getCurrentSeason();
  const visible = await getVisibleUnits(user);

  const parishes = await db.orgUnit.findMany({
    where: { id: { in: visible.map((u) => u.id) }, type: "PARISH" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const parishId =
    parishes.find((p) => p.id === sp.parish)?.id ??
    (parishes.length === 1 ? parishes[0].id : undefined);
  const level = LEVELS.includes(sp.level as Level) ? (sp.level as Level) : undefined;

  const candidates =
    parishId && season
      ? await db.candidate.findMany({
          where: {
            parishId,
            seasonId: season.id,
            status: { not: "WITHDRAWN" },
            ...(level ? { level } : {}),
          },
          include: { entries: true, parish: { select: { name: true } } },
          orderBy: [{ level: "asc" }, { fullName: "asc" }],
          take: 500,
        })
      : [];

  const host = (await headers()).get("host") ?? "";

  return (
    <div className="qwide">
      <div className="qhead no-print">
        <div>
          <h1>Candidate ID slips</h1>
          <p className="muted">
            {season ? `Season ${season.name}` : "No season yet"} · Print one slip for each
            candidate so they can log in on the day
          </p>
        </div>
        <PrintButton count={candidates.length} />
      </div>

      <form method="get" className="slp-filters no-print">
        <div>
          <label htmlFor="parish">Parish</label>
          <select id="parish" name="parish" defaultValue={parishId ?? ""}>
            <option value="">Choose a parish…</option>
            {parishes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="level">Category</label>
          <select id="level" name="level" defaultValue={level ?? ""}>
            <option value="">All categories</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          Show slips
        </button>
      </form>

      {!parishId && <p className="qempty no-print">Choose a parish to see its slips.</p>}
      {parishId && candidates.length === 0 && (
        <p className="qempty no-print">No registered candidates for this choice.</p>
      )}

      <div className="slp-grid">
        {candidates.map((c) => {
          const comps = c.entries
            .map((e) => e.competition)
            .sort((a, b) => COMPETITIONS.indexOf(a) - COMPETITIONS.indexOf(b));
          return (
            <div className="slp" key={c.id}>
              <div className="slp-brand">
                <span>{APP_NAME}</span>
                <span>{season?.name}</span>
              </div>
              <div className="slp-name">{c.fullName}</div>
              <div className="slp-code">{c.code}</div>
              <div className="slp-meta">
                {LEVEL_LABEL[c.level]} · {c.parish.name}
                <br />
                {comps.map((k) => COMPETITION_LABEL[k]).join(" · ")}
              </div>
              <div className="slp-foot">
                Keep this slip safe. To start, go to {host ? `${host}/play` : "the quiz page"} and
                enter this ID and the PIN your teacher gives you.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
