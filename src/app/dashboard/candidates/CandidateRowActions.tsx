"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { setWithdrawnAction, updateCandidateAction } from "./edit-actions";
import {
  COMPETITIONS,
  COMPETITION_LABEL,
  LEVELS,
  LEVEL_LABEL,
} from "@/lib/levels";

export default function CandidateRowActions({
  id,
  fullName,
  dateOfBirth,
  level,
  gender,
  competitions,
  guardianPhone,
  withdrawn,
}: {
  id: string;
  fullName: string;
  dateOfBirth: string;
  level: string;
  gender: string;
  competitions: string[];
  guardianPhone: string;
  withdrawn: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, saving] = useActionState(
    updateCandidateAction.bind(null, id),
    {} as { error?: string; ok?: string }
  );
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);

  function toggleWithdrawn() {
    if (
      !withdrawn &&
      !window.confirm(`Withdraw ${fullName}? You can restore them later.`)
    ) {
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await setWithdrawnAction(id, !withdrawn);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {!withdrawn && (
          <button type="button" className="btn btn-sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          style={withdrawn ? undefined : { color: "var(--danger)" }}
          onClick={toggleWithdrawn}
          disabled={busy}
        >
          {busy ? "Please wait..." : withdrawn ? "Restore" : "Withdraw"}
        </button>
        {error && (
          <span role="alert" className="text-sm text-danger">
            {error}
          </span>
        )}
      </div>

      {editing && (
        <form action={formAction} className="form-grid mt-4">
          <div className="span-2">
            <label className="label">Category (age group)</label>
            <select name="level" defaultValue={level} required className="field">
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </div>
          <div className="span-2">
            <label className="label">Full name</label>
            <input name="fullName" defaultValue={fullName} required className="field" />
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={dateOfBirth}
              required
              className="field"
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select name="gender" defaultValue={gender} required className="field">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <fieldset className="span-2">
            <legend className="label">Competitions</legend>
            <div className="choice-group">
              {COMPETITIONS.map((c) => (
                <label key={c} className="choice">
                  <input
                    type="checkbox"
                    name="competitions"
                    value={c}
                    defaultChecked={competitions.includes(c)}
                  />
                  {COMPETITION_LABEL[c]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="span-2">
            <label className="label">Parent or guardian phone</label>
            <input
              name="guardianPhone"
              type="tel"
              defaultValue={guardianPhone}
              className="field"
            />
          </div>

          {state.error && (
            <p role="alert" className="notice notice-error span-2">
              {state.error}
            </p>
          )}

          <div className="span-2">
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}