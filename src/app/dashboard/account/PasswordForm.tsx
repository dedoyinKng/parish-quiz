"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    {} as { error?: string; ok?: string }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="pw-current" className="label">
          Current password
        </label>
        <input
          id="pw-current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>
      <div>
        <label htmlFor="pw-next" className="label">
          New password
        </label>
        <input
          id="pw-next"
          name="next"
          type="password"
          autoComplete="new-password"
          required
          className="field"
        />
      </div>
      <div>
        <label htmlFor="pw-confirm" className="label">
          Confirm new password
        </label>
        <input
          id="pw-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="field"
        />
      </div>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="notice">
          {state.ok}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}