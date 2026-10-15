import { requireUser } from "@/lib/auth";
import PasswordForm from "./PasswordForm";

export default async function AccountPage() {
  await requireUser();

  return (
    <div className="max-w-sm">
      <h1 className="text-3xl font-semibold">Password</h1>
      <p className="mt-1 text-ink-soft">
        Use at least 8 characters that you don&apos;t use anywhere else.
      </p>
      <div className="card mt-8 p-5">
        <PasswordForm />
      </div>
    </div>
  );
}