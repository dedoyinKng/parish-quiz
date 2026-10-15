import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import RegisterCandidateForm from "../RegisterCandidateForm";

export default async function NewCandidatePage() {
  const user = await requireUser();
  if (user.role !== "PARISH_TEACHER" || !user.orgUnitId) {
    redirect("/dashboard/candidates");
  }

  return (
    <div className="page-narrow">
      <Link href="/dashboard/candidates" className="link inline-flex items-center gap-2">
        <ArrowLeft size={16} />
        Back to candidates
      </Link>
      <h1 className="mt-3 text-3xl font-semibold">Add candidate</h1>
      <p className="mt-1 text-ink-soft">
        Choose the category first. The age is checked against it.
      </p>
      <div className="card mt-6 p-5">
        <RegisterCandidateForm />
      </div>
    </div>
  );
}