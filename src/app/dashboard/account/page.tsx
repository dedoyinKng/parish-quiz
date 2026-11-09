import { requireUser } from "@/lib/auth";
import PasswordForm from "./PasswordForm";
import DeleteAccountForm from "./DeleteAccountForm";

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

      <h2 className="mt-12 text-xl font-semibold text-red-700">
        Delete my account
      </h2>
      <p className="mt-1 text-ink-soft">
        You will be signed out and will no longer be able to log in.
        Candidates and results you entered are kept.
      </p>
      <div className="card mt-4 p-5">
        <DeleteAccountForm />
      </div>
    </div>
  );
}
