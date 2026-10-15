"use client";

import { useActionState } from "react";
import { importUnitsAction } from "./actions";

export default function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importUnitsAction,
    {} as { error?: string; ok?: string }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="csv-file" className="label">
          CSV file
        </label>
        <input
          id="csv-file"
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="field py-2"
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
        {pending ? "Importing..." : "Import CSV"}
      </button>
    </form>
  );
}