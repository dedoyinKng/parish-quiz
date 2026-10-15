import {
  LayoutDashboard,
  Network,
  Users,
  KeyRound,
  LogOut,
  ClipboardList,
  BookOpen,
  CalendarClock,
  Trophy,
  Activity,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canScheduleExams } from "@/lib/exams";
import { APP_NAME } from "@/lib/brand";
import { ROLE_LABELS, creatableRoles } from "@/lib/permissions";
import { STAGES, stageClass } from "@/lib/stage";
import { logoutAction } from "@/app/login/actions";
import NavLink from "./NavLink";
import SidebarToggle from "./SidebarToggle";
import "../qb.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const canManageStaff = creatableRoles(user.role).length > 0;
  const canSeeQuestions =
    user.role === "SUPER_ADMIN" || user.role === "QUESTION_UPLOADER";
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sekrenton-logo.svg" alt="" style={{ height: "1.9rem", width: "auto" }} />
          </div>
          <div className="brand-text">
            <span className="sidebar-name">{APP_NAME}</span>
            <span className="sidebar-sub">{ROLE_LABELS[user.role]}</span>
          </div>
          <SidebarToggle variant="inside" />
        </div>

        <div className="menu-label">Menu</div>
        <nav className="sidebar-nav" aria-label="Main">
          <NavLink href="/dashboard" label="Overview" exact icon={<LayoutDashboard size={20} />} />
          {user.role === "SUPER_ADMIN" && (
            <NavLink href="/dashboard/units" label="Hierarchy" icon={<Network size={20} />} />
          )}
          {user.role !== "QUESTION_UPLOADER" && (
            <NavLink href="/dashboard/candidates" label="Candidates" icon={<ClipboardList size={20} />} />
          )}
          {user.role !== "QUESTION_UPLOADER" && (
            <NavLink href="/dashboard/exams" label="Competitions" icon={<CalendarClock size={20} />} />
          )}
          {user.role !== "QUESTION_UPLOADER" && (
            <NavLink href="/dashboard/results" label="Results" icon={<Trophy size={20} />} />
          )}
          {canScheduleExams(user.role) && (
            <NavLink href="/dashboard/monitor" label="Venue monitor" icon={<Activity size={20} />} />
          )}
          {canSeeQuestions && (
            <NavLink href="/dashboard/questions" label="Question bank" icon={<BookOpen size={20} />} />
          )}
          {canManageStaff && (
            <NavLink href="/dashboard/users" label="Staff accounts" icon={<Users size={20} />} />
          )}
          <NavLink href="/dashboard/account" label="Password" icon={<KeyRound size={20} />} />
        </nav>

        <div className="sidebar-foot">
          <div className="user-card">
            <div className="avatar">{initials || "?"}</div>
            <div className="user-name">{user.name}</div>
            <form action={logoutAction}>
              <button type="submit" className="icon-btn" aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <SidebarToggle variant="open" />
        </div>
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}