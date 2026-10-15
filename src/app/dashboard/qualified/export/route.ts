import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/levels";
import { STAGE_LABEL } from "@/lib/exams";
import { getUnitResult } from "@/lib/qualify";

function cell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") {
    return new Response("Not allowed", { status: 403 });
  }

  const stage = new URL(req.url).searchParams.get("stage"); // optional: PARISH, AREA, ZONE, PROVINCE

  const season = await getCurrentSeason();
  if (!season) return new Response("No season", { status: 404 });

  const visible = await getVisibleUnits(user);
  const exams = await db.exam.findMany({
    where: {
      seasonId: season.id,
      orgUnitId: { in: visible.map((u) => u.id) },
      competition: { in: ["ZEAL_QUIZ", "BIBLE_QUIZ"] },
    },
    include: { orgUnit: true },
  });

  const groups = new Map<string, { unitId: string; type: string; unitName: string; level: string }>();
  for (const e of exams) {
    if (stage && e.orgUnit.type !== stage) continue;
    groups.set(`${e.orgUnitId}|${e.level}`, {
      unitId: e.orgUnitId,
      type: e.orgUnit.type,
      unitName: e.orgUnit.name,
      level: e.level,
    });
  }

  const results = await Promise.all(
    [...groups.values()].map(async (g) => ({
      g,
      r: await getUnitResult(season.id, g.unitId, g.level),
    }))
  );

  const winners = results.filter((x) => x.r.winner);
  const candIds = winners.map((x) => x.r.winner!.candidateId);
  const cands = await db.candidate.findMany({ where: { id: { in: candIds } } });
  const cOf = new Map(cands.map((c) => [c.id, c]));

  const units = await db.orgUnit.findMany({
    select: { id: true, name: true, type: true, parentId: true },
  });
  const uOf = new Map(units.map((u) => [u.id, u]));
  const ancestor = (startId: string, type: string) => {
    let cur = uOf.get(startId);
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      if (cur.type === type) return cur.name;
      seen.add(cur.id);
      cur = cur.parentId ? uOf.get(cur.parentId) : undefined;
    }
    return "";
  };

  const header = [
    "Candidate ID",
    "Full name",
    "Gender",
    "Date of birth",
    "Category",
    "Parish",
    "Area",
    "Zone",
    "Qualified from",
    "Stage",
    "Zeal score",
    "Bible score",
    "Total score",
    "Out of",
    "Time (seconds)",
    "Guardian phone",
  ];

  const rows = winners.map(({ g, r }) => {
    const w = r.winner!;
    const c = cOf.get(w.candidateId)!;
    return [
      c.code,
      c.fullName,
      c.gender,
      c.dateOfBirth.toISOString().slice(0, 10),
      LEVEL_LABEL[g.level as keyof typeof LEVEL_LABEL],
      ancestor(c.parishId, "PARISH"),
      ancestor(c.parishId, "AREA"),
      ancestor(c.parishId, "ZONE"),
      g.unitName,
      STAGE_LABEL[g.type as keyof typeof STAGE_LABEL],
      w.zeal,
      w.bible,
      w.total,
      w.maxTotal,
      w.seconds,
      c.guardianPhone,
    ];
  });

  const csv =
    "\uFEFF" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qualifiers-${season.name.replace("/", "-")}${stage ? "-" + stage.toLowerCase() : ""}.csv"`,
    },
  });
}
