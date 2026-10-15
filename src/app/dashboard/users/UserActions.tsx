"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUserAction,
  resetPasswordAction,
  setActiveAction,
  updateUserAction,
} from "./actions";

export default function UserActions({
  userId,
  active,
  name,
  email,
  phone,
}: {
  userId: string;
  active: boolean;
  name: string;
  email: string;
  phone: string;
}) {
  const [reset, resetAction, resetting] = useActionState(
    resetPasswordAction,
    {} as { error?: string; ok?: string; password?: string }
  );
  const [editing, setEditing] = useState(false);
  const [saved, saveAction, saving] = useActionState(
    updateUserAction.bind(null, userId),
    {} as { error?: string; ok?: string }
  );
  const [deleting, startDelete] = useTransition();
  const [delError, setDelError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (saved.ok) setEditing(false);
  }, [saved]);

  function onDelete() {
    if (!window.confirm(`Delete ${name}'s account? This cannot be undone.`)) return;
    setDelError("");
    startDelete(async () => {
      const res = await deleteUserAction(userId);
      if (res.error) setDelError(res.error);
      else router.push("/dashboard/users");
    });
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setEditing((v) => !v)}>
          {editing ? "Close" : "Edit"}
        </button>
        <form action={resetAction}>
          <input type="hidden" name="userId" value={userId} />
          <button disabled={resetting} className="btn btn-sm">
            Reset password
          </button>
        </form>
        <form action={setActiveAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="active" value={active ? "false" : "true"} />
          <button className="btn btn-sm">{active ? "Deactivate" : "Activate"}</button>
        </form>
        <button
          type="button"
          className="btn btn-sm"
          style={{ color: "var(--danger)" }}
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {editing && (
        <form action={saveAction} className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Full name</label>
            <input name="name" defaultValue={name} required className="field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={email} required className="field" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" defaultValue={phone} className="field" />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {(reset.error || saved.error || delError) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {reset.error || saved.error || delError}
        </p>
      )}
      {reset.password && (
        <p role="status" className="mt-2 text-sm">
          New password:{" "}
          <code className="rounded bg-paper px-1 font-semibold">{reset.password}</code>
        </p>
      )}
    </div>
  );
}