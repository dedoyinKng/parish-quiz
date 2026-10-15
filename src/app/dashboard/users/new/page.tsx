import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import {
  ROLE_LABELS,
  ROLE_UNIT_TYPE,
  creatableRoles,
} from "@/lib/permissions";
import CreateUserForm from "../CreateUserForm";

export default async function NewUserPage() {
  const actor = await requireUser();
  const roles = creatableRoles(actor.role);
  if (roles.length === 0) redirect("/dashboard");

  const visible = await getVisibleUnits(actor);

  return (
    <div className="page-narrow">
      <Link href="/dashboard/users" className="link inline-flex items-center gap-2">
        <ArrowLeft size={16} />
        Back to staff accounts
      </Link>
      <h1 className="mt-3 text-3xl font-semibold">Add account</h1>
      <p className="mt-1 text-ink-soft">
        A temporary password is shown once after you create it.
      </p>
      <div className="card mt-6 p-5">
        <CreateUserForm
          roles={roles.map((r) => ({
            value: r,
            label: ROLE_LABELS[r],
            unitType: ROLE_UNIT_TYPE[r] ?? "",
          }))}
          units={visible.map((u) => ({
            id: u.id,
            type: u.type,
            name: u.name,
            code: u.code,
          }))}
        />
      </div>
    </div>
  );
}