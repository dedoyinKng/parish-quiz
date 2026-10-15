import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import type { Prisma, Role } from "@prisma/client";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS, ROLE_RANK, creatableRoles } from "@/lib/permissions";
import { STAGE_LABEL, stageClass } from "@/lib/stage";
import SearchFilters from "@/components/SearchFilters";

const PAGE_SIZE = 300;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function UsersPage({
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
  const role = one("role");
  const status = one("status");

  const actor = await requireUser();
  if (creatableRoles(actor.role).length === 0) redirect("/dashboard");

  const visible = await getVisibleUnits(actor);
  const roleOptions = (Object.keys(ROLE_LABELS) as Role[]).filter(
    (r) => ROLE_RANK[r] <= ROLE_RANK[actor.role]
  );

  const scope: Prisma.UserWhereInput =
    actor.role === "SUPER_ADMIN"
      ? {}
      : { orgUnitId: { in: visible.map((u) => u.id) } };

  const where: Prisma.UserWhereInput = {
    ...scope,
    ...(roleOptions.includes(role as Role) ? { role: role as Role } : {}),
    ...(status === "active"
      ? { active: true }
      : status === "deactivated"
        ? { active: false }
        : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { orgUnit: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: PAGE_SIZE,
    }),
  ]);

  const filtered = !!(q || role || status);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="text-3xl font-semibold">Staff accounts</h1>
          <p className="mt-1 text-ink-soft">
            {total} {filtered ? "matching" : "accounts"} · People who work under
            you.
          </p>
        </div>
        <Link href="/dashboard/users/new" className="btn btn-primary">
          <Plus size={18} />
          Add account
        </Link>
      </div>

      <SearchFilters
        placeholder="Search by name or email"
        q={q}
        clearHref="/dashboard/users"
        active={filtered}
        filters={[
          {
            name: "role",
            label: "All roles",
            value: role,
            options: roleOptions.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
          },
          {
            name: "status",
            label: "All statuses",
            value: status,
            options: [
              { value: "active", label: "Active" },
              { value: "deactivated", label: "Deactivated" },
            ],
          },
        ]}
      />

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="thead cols-users">
          <span>Person</span>
          <span>Role</span>
          <span>Unit</span>
          <span>Status</span>
        </div>

        {users.length === 0 && (
          <p className="empty">
            {filtered ? "No accounts match these filters." : "No accounts yet."}
          </p>
        )}

        {users.map((u) => (
          <Link
            key={u.id}
            href={`/dashboard/users/${u.id}`}
            className="trow cols-users"
          >
            <div className="cell-person">
              <span className="avatar-sq">{initials(u.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {u.name}
                  {u.id === actor.id && (
                    <span className="muted" style={{ marginLeft: "0.5rem" }}>
                      you
                    </span>
                  )}
                </div>
                <div className="muted">{u.email}</div>
              </div>
            </div>
            <span className="hide-sm">
              <span className="pill">{ROLE_LABELS[u.role]}</span>
            </span>
            <span className="hide-sm">
              {u.orgUnit && (
                <span className={`tag ${stageClass(u.orgUnit.type)}`}>
                  <span className="flag" aria-hidden />
                  {u.orgUnit.name}
                  <span className="font-normal text-ink-soft">
                    {STAGE_LABEL[u.orgUnit.type]}
                  </span>
                </span>
              )}
            </span>
            <span>
              <span className={`pill ${u.active ? "pill-ok" : "pill-danger"}`}>
                {u.active ? "Active" : "Deactivated"}
              </span>
            </span>
          </Link>
        ))}
      </section>

      {total > PAGE_SIZE && (
        <p className="muted">
          Showing the first {PAGE_SIZE} of {total}. Use the search and filters to
          narrow the list.
        </p>
      )}
    </div>
  );
}