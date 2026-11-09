"use client";

import { useActionState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { deleteAccountAction } from "./actions";

export default function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, {} as {
    error?: string;
  });

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">
        Your password
        <div className="mt-1">
          <PasswordInput
            name="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="sure" className="mt-1" />
        <span>I understand this permanently removes my account.</span>
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
