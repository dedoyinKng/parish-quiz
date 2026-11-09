import Link from "next/link";
import { db } from "@/lib/db";
import AuthHero from "@/components/AuthHero";
import RegisterForm from "./RegisterForm";
import "../login/login-hub.css";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const units = await db.orgUnit.findMany({ orderBy: { name: "asc" } });
  const teachers = await db.user.findMany({
    where: { role: "PARISH_TEACHER", orgUnitId: { not: null } },
    select: { orgUnitId: true },
  });
  const withTeacher = new Set(teachers.map((t) => t.orgUnitId));

  return (
    <main className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      <AuthHero />

      <section className="hub flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="hub-back">
            ← Back to website
          </Link>

          <h2 className="mt-6 text-3xl font-semibold">Register your parish</h2>
          <p className="muted mt-1">
            Find your parish, then create your teacher account.
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
      </section>
    </main>
  );
}
