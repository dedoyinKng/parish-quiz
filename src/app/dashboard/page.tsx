import Link from "next/link";
import {
  Church,
  MapPin,
  Map as MapIcon,
  Landmark,
  Network,
  Users,
  KeyRound,
  ArrowUpRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { ROLE_LABELS, creatableRoles } from "@/lib/permissions";
import { STAGES, STAGE_PLURAL, stageClass } from "@/lib/stage";

const STAGE_ICON: Record<string, ReactNode> = {
  PARISH: <Church size={20} />,
  AREA: <MapPin size={20} />,
  ZONE: <MapIcon size={20} />,
  PROVINCE: <Landmark size={20} />,
};

const STAGE_CAPTION: Record<string, string> = {
  PARISH: "Where candidates register",
  AREA: "Where parish winners meet",
  ZONE: "Where area winners meet",
  PROVINCE: "Final stage on this platform",
};

const TYPE_ORDER = ["PROVINCE", "ZONE", "AREA", "PARISH"];

export default async function Overview() {
  const user = await requireUser();
  const units = await getVisibleUnits(user);
  const canManageStaff = creatableRoles(user.role).length > 0;
  const isSuper = user.role === "SUPER_ADMIN";

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });

  const count = (type: string) => units.filter((u) => u.type === type).length;

  const recentUsers = canManageStaff
    ? await db.user.findMany({
        where: isSuper
          ? { id: { not: user.id } }
          : { id: { not: user.id }, orgUnitId: { in: units.map((u) => u.id) } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { orgUnit: true },
      })
    : [];

  const yourUnits = [...units]
    .sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 6);

  const actions: { href: string; title: string; text: string; icon: ReactNode }[] = [];
  if (isSuper) {
    actions.push({
      href: "/dashboard/units",
      title: "Hierarchy",
      text: "Add or import provinces, zones, areas and parishes",
      icon: <Network size={22} />,
    });
  }
  if (canManageStaff) {
    actions.push({
      href: "/dashboard/users",
      title: "Staff accounts",
      text: "Create coordinator and teacher logins",
      icon: <Users size={22} />,
    });
  }
  actions.push({
    href: "/dashboard/account",
    title: "Password",
    text: "Change your sign-in password",
    icon: <KeyRound size={22} />,
  });

  return (
    <div className="stack">
      <section className="banner">
        <p className="banner-date">{today}</p>
        <h1 className="banner-title">Welcome, {user.name}</h1>
        <p className="banner-sub">
          {ROLE_LABELS[user.role]}
          {user.orgUnit ? ` · ${user.orgUnit.name}` : ""}
        </p>
      </section>

      <section className="grid-4" aria-label="Stages">
        {STAGES.map((s) => (
          <div key={s} className={`card stat ${stageClass(s)}`}>
            <div className="stat-top">
              <span className="stat-label">{STAGE_PLURAL[s]}</span>
              <span className="chip">{STAGE_ICON[s]}</span>
            </div>
            <p className="stat-value">{count(s)}</p>
            <p className="stat-caption">{STAGE_CAPTION[s]}</p>
          </div>
        ))}
      </section>

      <section className="grid-3" aria-label="Quick actions">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="card action">
            <span className="chip">{a.icon}</span>
            <span>
              <span className="action-title">{a.title}</span>
              <br />
              <span className="action-text">{a.text}</span>
            </span>
            <ArrowUpRight size={18} className="action-arrow" />
          </Link>
        ))}
      </section>

      <section className="grid-2">
        <div className="card panel">
          <div className="panel-head">
            <h2 className="panel-title">Your units</h2>
            {isSuper && (
              <Link href="/dashboard/units" className="link">
                View all
              </Link>
            )}
          </div>
          {yourUnits.length === 0 && <p className="muted">No units assigned yet.</p>}
          {yourUnits.map((u) => (
            <div key={u.id} className={`row ${stageClass(u.type)}`}>
              <span className="flag" />
              <div className="row-main">
                <div style={{ fontWeight: 600 }}>{u.name}</div>
                <div className="muted">{u.code}</div>
              </div>
            </div>
          ))}
        </div>

        {canManageStaff && (
          <div className="card panel">
            <div className="panel-head">
              <h2 className="panel-title">Recent accounts</h2>
              <Link href="/dashboard/users" className="link">
                Manage
              </Link>
            </div>
            {recentUsers.length === 0 && <p className="muted">No other accounts yet.</p>}
            {recentUsers.map((u) => (
              <div key={u.id} className="row">
                <div className="row-main">
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div className="muted">
                    {ROLE_LABELS[u.role]}
                    {u.orgUnit ? ` · ${u.orgUnit.name}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}