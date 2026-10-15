import Link from "next/link";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const units = await db.orgUnit.findMany({ orderBy: { name: "asc" } });
  const teachers = await db.user.findMany({
    where: { role: "PARISH_TEACHER", orgUnitId: { not: null } },
    select: { orgUnitId: true },
  });
  const withTeacher = new Set(teachers.map((t) => t.orgUnitId));

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-lg p-6">
        <h1 className="text-2xl font-semibold">Register your parish</h1>
        <p className="muted mt-1">
          {APP_NAME}. Find your parish, then create your teacher account.
        </p>

        <div className="mt-6">
          <RegisterForm
            units={units.map((u) => ({
              id: u.id,
              type: u.type,
              name: u.name,
              parentId: u.parentId,
              hasTeacher: withTeacher.has(u.id),
              hqOf: units
                .filter((x) => x.hqParishId === u.id)
                .map((x) => x.name)
                .join(", "),
            }))}
          />
        </div>

        <p className="muted mt-6">
          Already registered?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}