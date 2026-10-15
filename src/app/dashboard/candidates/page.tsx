import Link from "next/link";
import { Plus, Printer } from "lucide-react";
import type { Competition, Level, Prisma } from "@prisma/client";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import {
  COMPETITIONS,
  COMPETITION_LABEL,
  LEVELS,
  LEVEL_LABEL,
} from "@/lib/levels";
import SearchFilters from "@/components/SearchFilters";

const PAGE_SIZE = 300;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v.trim() : "";
  };
  const q = one("q");
  const level = one("level");
  const competition = one("competition");
  const parish = one("parish");
  const status = one("status");

  const user = await requireUser();
  const isTeacher = user.role === "PARISH_TEACHER" && !!user.orgUnitId;

  const season = await getCurrentSeason();
  const units = await getVisibleUnits(user);
  const parishes = units
    .filter((u) => u.type === "PARISH")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const parishIds = parishes.map((p) => p.id);

  const scope: Prisma.CandidateWhereInput = {
    parishId: { in: parishIds },
    ...(season ? { seasonId: season.id } : {}),
  };

  const where: Prisma.CandidateWhereInput = {
    ...scope,
    ...(parish && parishIds.includes(parish) ? { parishId: parish } : {}),
    ...(LEVELS.includes(level as Level) ? { level: level as Level } : {}),
    ...(COMPETITIONS.includes(competition as Competition)
      ? { entries: { some: { competition: competition as Competition } } }
      : {}),
    ...(status === "withdrawn"
      ? { status: "WITHDRAWN" }
      : status === "all"
        ? {}
        : { status: { not: "WITHDRAWN" } }),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, candidates, byLevel] = await Promise.all([
    db.candidate.count({ where }),
    db.candidate.findMany({
      where,
      include: { parish: true, entries: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    db.candidate.groupBy({
      by: ["level"],
      where: { ...scope, status: { not: "WITHDRAWN" } },
      _count: { _all: true },
    }),
  ]);

  const levelCount = (l: Level) =>
    byLevel.find((b) => b.level === l)?._count._all ?? 0;
  const filtered = !!(q || level || competition || parish || status);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="text-3xl font-semibold">Candidates</h1>
          <p className="mt-1 text-ink-soft">
            {total} {filtered ? "matching" : "registered"}
            {season && (
              <>
                {" "}
                · Season {season.name} · Age counted on{" "}
                {season.ageReferenceDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/dashboard/candidates/slips" className="btn">
            <Printer size={18} />
            Print ID slips
          </Link>
          {isTeacher && (
            <Link href="/dashboard/candidates/new" className="btn btn-primary">
              <Plus size={18} />
              Add candidate
            </Link>
          )}
        </div>
      </div>

      <section className="grid-4" aria-label="Candidates by category">
        {LEVELS.map((l) => (
          <div key={l} className="card stat">
            <span className="stat-label">{LEVEL_LABEL[l]}</span>
            <p className="stat-value">{levelCount(l)}</p>
          </div>
        ))}
      </section>

      <SearchFilters
        placeholder="Search by name or candidate ID"
        q={q}
        clearHref="/dashboard/candidates"
        active={filtered}
        filters={[
          {
            name: "level",
            label: "All categories",
            value: level,
            options: LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] })),
          },
          {
            name: "competition",
            label: "All competitions",
            value: competition,
            options: COMPETITIONS.map((c) => ({
              value: c,
              label: COMPETITION_LABEL[c],
            })),
          },
          ...(parishes.length > 1
            ? [
                {
                  name: "parish",
                  label: "All parishes",
                  value: parish,
                  options: parishes.map((p) => ({ value: p.id, label: p.name })),
                },
              ]
            : []),
          {
            name: "status",
            label: "Active",
            value: status,
            options: [
              { value: "withdrawn", label: "Withdrawn" },
              { value: "all", label: "All" },
            ],
          },
        ]}
      />

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="thead">
          <span>Candidate</span>
          <span>Category</span>
          <span>Parish</span>
          <span>Competitions</span>
          <span>Status</span>
        </div>

        {candidates.length === 0 && (
          <p className="empty">
            {filtered ? "No candidates match these filters." : "No candidates yet."}
          </p>
        )}

        {candidates.map((c) => {
          const withdrawn = c.status === "WITHDRAWN";
          return (
            <Link key={c.id} href={`/dashboard/candidates/${c.id}`} className="trow">
              <div className="cell-person">
                <span className="avatar-sq">{initials(c.fullName)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                  <div className="mono">{c.code}</div>
                </div>
              </div>
              <span className="hide-sm">
                <span className="pill">{LEVEL_LABEL[c.level]}</span>
              </span>
              <span className="hide-sm">{c.parish.name}</span>
              <span className="hide-sm muted">
                {c.entries.map((e) => COMPETITION_LABEL[e.competition]).join(", ")}
              </span>
              <span>
                <span className={`pill ${withdrawn ? "pill-danger" : "pill-ok"}`}>
                  {withdrawn ? "Withdrawn" : "Active"}
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      {total > PAGE_SIZE && (
        <p className="muted">
          Showing the newest {PAGE_SIZE} of {total}. Use the search and filters to
          narrow the list.
        </p>
      )}
    </div>
  );
}