import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, ROLE_RANK } from "@/lib/permissions";
import { STAGE_LABEL, stageClass } from "@/lib/stage";
import UserActions from "../UserActions";

const dateTime = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireUser();

  const person = await db.user.findUnique({
    where: { id },
    include: { orgUnit: true },
  });
  if (!person) notFound();

  if (actor.role !== "SUPER_ADMIN" && person.id !== actor.id) {
    const visible = await getVisibleUnits(actor);
    if (!person.orgUnitId || !visible.some((u) => u.id === person.orgUnitId)) {
      notFound();
    }
  }

  const canAct = person.id !== actor.id && ROLE_RANK[person.role] < ROLE_RANK[actor.role];

  return (
    <div className="stack page-narrow">
      <div>
        <Link href="/dashboard/users" className="link inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to staff accounts
        </Link>
      </div>

      <section className="card p-5">
        <div className="page-head">
          <div>
            <h1 className="text-3xl font-semibold">{person.name}</h1>
            <p className="muted mt-1">{person.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill">{ROLE_LABELS[person.role]}</span>
            <span className={`pill ${person.active ? "pill-ok" : "pill-danger"}`}>
              {person.active ? "Active" : "Deactivated"}
            </span>
          </div>
        </div>

        <div className="facts mt-6">
          <div>
            <div className="fact-label">Unit</div>
            <div className="fact-value">
              {person.orgUnit ? (
                <span className={`tag ${stageClass(person.orgUnit.type)}`}>
                  <span className="flag" aria-hidden />
                  {person.orgUnit.name}
                  <span className="font-normal text-ink-soft">
                    {STAGE_LABEL[person.orgUnit.type]}
                  </span>
                </span>
              ) : (
                "None"
              )}
            </div>
          </div>
          <div>
            <div className="fact-label">Phone</div>
            <div className="fact-value">{person.phone || "Not given"}</div>
          </div>
          <div>
            <div className="fact-label">Account created</div>
            <div className="fact-value">{dateTime(person.createdAt)}</div>
          </div>
        </div>
      </section>

      {canAct ? (
        <section className="card p-5">
          <h2 className="text-xl font-semibold">Manage</h2>
          <p className="muted mt-1">
            Edit details, reset the password, deactivate or delete this account.
          </p>
          <UserActions
            userId={person.id}
            active={person.active}
            name={person.name}
            email={person.email}
            phone={person.phone ?? ""}
          />
        </section>
      ) : (
        person.id === actor.id && (
          <p className="muted">This is your own account. Change your password under Password.</p>
        )
      )}
    </div>
  );
}