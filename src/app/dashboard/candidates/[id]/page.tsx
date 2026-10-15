import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { db } from "@/lib/db";
import { COMPETITION_LABEL, LEVEL_LABEL, ageOn } from "@/lib/levels";
import { STAGES, STAGE_LABEL, stageClass } from "@/lib/stage";
import CandidateRowActions from "../CandidateRowActions";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "progress", label: "Progress" },
  { key: "reports", label: "Reports" },
  { key: "records", label: "Records" },
];

const dateOnly = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const dateTime = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "overview";

  const user = await requireUser();
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: { parish: true, entries: true, season: true, createdBy: true },
  });
  if (!candidate) notFound();

  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === candidate.parishId)) notFound();

  // Location path: parish > area > zone > province
  const all = await db.orgUnit.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const byId = new Map(all.map((u) => [u.id, u]));
  const path: string[] = [];
  let cursor: string | null = candidate.parishId;
  for (let i = 0; i < 5 && cursor; i++) {
    const u = byId.get(cursor);
    if (!u) break;
    path.push(u.name);
    cursor = u.parentId;
  }

  const withdrawn = candidate.status === "WITHDRAWN";
  const mine =
    user.role === "PARISH_TEACHER" && user.orgUnitId === candidate.parishId;
  const age = ageOn(candidate.dateOfBirth, candidate.season.ageReferenceDate);

  return (
    <div className="stack">
      <div>
        <Link href="/dashboard/candidates" className="link inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to candidates
        </Link>
      </div>

      <section className="card p-5">
        <div className="page-head">
          <div>
            <h1 className="text-3xl font-semibold">{candidate.fullName}</h1>
            <p className="muted mt-1">{path.join(" · ")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="code" style={{ minWidth: 0, fontSize: "1.125rem" }}>
              {candidate.code}
            </span>
            <span className="pill">{LEVEL_LABEL[candidate.level]}</span>
            <span className={`pill ${withdrawn ? "pill-danger" : "pill-muted"}`}>
              {withdrawn ? "Withdrawn" : "Active"}
            </span>
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="Candidate sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/candidates/${id}?tab=${t.key}`}
            className="tab"
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <section className="card p-5">
            <h2 className="text-xl font-semibold">Profile</h2>
            <div className="facts mt-4">
              <div>
                <div className="fact-label">Date of birth</div>
                <div className="fact-value">{dateOnly(candidate.dateOfBirth)}</div>
              </div>
              <div>
                <div className="fact-label">
                  Age on {dateOnly(candidate.season.ageReferenceDate)}
                </div>
                <div className="fact-value">{age} years</div>
              </div>
              <div>
                <div className="fact-label">Gender</div>
                <div className="fact-value">
                  {candidate.gender === "MALE" ? "Male" : "Female"}
                </div>
              </div>
              <div>
                <div className="fact-label">Category</div>
                <div className="fact-value">{LEVEL_LABEL[candidate.level]}</div>
              </div>
              <div>
                <div className="fact-label">Guardian phone</div>
                <div className="fact-value">{candidate.guardianPhone || "Not given"}</div>
              </div>
              <div>
                <div className="fact-label">Guardian consent</div>
                <div className="fact-value">
                  {candidate.guardianConsent ? "Given" : "Not given"}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="fact-label">Competitions</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {candidate.entries.map((e) => (
                  <span key={e.id} className="pill">
                    {COMPETITION_LABEL[e.competition]}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {mine && (
            <section className="card p-5">
              <h2 className="text-xl font-semibold">Manage</h2>
              <p className="muted mt-1">
                Fix a mistake or withdraw this candidate. The ID stays the same.
              </p>
              <CandidateRowActions
                id={candidate.id}
                fullName={candidate.fullName}
                dateOfBirth={candidate.dateOfBirth.toISOString().slice(0, 10)}
                level={candidate.level}
                gender={candidate.gender}
                competitions={candidate.entries.map((e) => e.competition)}
                guardianPhone={candidate.guardianPhone ?? ""}
                withdrawn={withdrawn}
              />
            </section>
          )}
        </>
      )}

      {tab === "progress" && (
        <>
          {candidate.entries.map((e) => (
            <section key={e.id} className="card p-5">
              <h2 className="text-xl font-semibold">
                {COMPETITION_LABEL[e.competition]}
              </h2>
              <div className="steps">
                {STAGES.map((s, i) => (
                  <div
                    key={s}
                    className={`step ${stageClass(s)} ${i === 0 ? "step-current" : ""}`}
                  >
                    <span className="flag" aria-hidden />
                    <div>
                      <div className="step-title">{STAGE_LABEL[s]}</div>
                      <div className="step-state">
                        {i === 0
                          ? withdrawn
                            ? "Withdrawn"
                            : "Registered"
                          : "Not reached yet"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="muted">
            Scores and qualification for each stage will appear here once quizzes
            have been held.
          </p>
        </>
      )}

      {tab === "reports" && (
        <section className="card p-5">
          <div className="empty">
            <p style={{ fontWeight: 600, color: "var(--ink)" }}>No reports yet</p>
            <p className="mt-1">
              Score reports and rankings will appear here after this candidate
              has taken a quiz.
            </p>
          </div>
        </section>
      )}

      {tab === "records" && (
        <section className="card p-5">
          <h2 className="text-xl font-semibold">Registration record</h2>
          <div className="facts mt-4">
            <div>
              <div className="fact-label">Candidate ID</div>
              <div className="fact-value">{candidate.code}</div>
            </div>
            <div>
              <div className="fact-label">Season</div>
              <div className="fact-value">{candidate.season.name}</div>
            </div>
            <div>
              <div className="fact-label">Registered at</div>
              <div className="fact-value">{candidate.parish.name}</div>
            </div>
            <div>
              <div className="fact-label">Registered by</div>
              <div className="fact-value">{candidate.createdBy.name}</div>
            </div>
            <div>
              <div className="fact-label">Registered on</div>
              <div className="fact-value">{dateTime(candidate.createdAt)}</div>
            </div>
            <div>
              <div className="fact-label">Last updated</div>
              <div className="fact-value">{dateTime(candidate.updatedAt)}</div>
            </div>
            <div>
              <div className="fact-label">Status</div>
              <div className="fact-value">
                {withdrawn ? "Withdrawn" : "Active"}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}