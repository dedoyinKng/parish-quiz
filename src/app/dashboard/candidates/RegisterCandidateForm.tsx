"use client";

import { useActionState } from "react";
import { registerCandidateAction } from "./actions";
import {
  COMPETITIONS,
  COMPETITION_LABEL,
  LEVELS,
  LEVEL_LABEL,
} from "@/lib/levels";

export default function RegisterCandidateForm() {
  const [state, formAction, pending] = useActionState(
    registerCandidateAction,
    {} as { error?: string; ok?: string; code?: string }
  );

  return (
    <div>
      {state.code && (
        <p className="notice mb-4">
          {state.ok} Candidate ID: <strong>{state.code}</strong>
        </p>
      )}

      <form action={formAction} key={state.code ?? "form"} className="form-grid">
        <div className="span-2">
          <label htmlFor="level" className="label">
            Category (age group)
          </label>
          <select id="level" name="level" required className="field">
            <option value="">Select...</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>

        <div className="span-2">
          <label htmlFor="fullName" className="label">
            Full name
          </label>
          <input id="fullName" name="fullName" required className="field" />
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="label">
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="gender" className="label">
            Gender
          </label>
          <select id="gender" name="gender" required className="field">
            <option value="">Select...</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        <fieldset className="span-2">
          <legend className="label">Competitions (choose one or more)</legend>
          <div className="choice-group">
            {COMPETITIONS.map((c) => (
              <label key={c} className="choice">
                <input type="checkbox" name="competitions" value={c} />
                {COMPETITION_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="span-2">
          <label htmlFor="guardianPhone" className="label">
            Parent or guardian phone
          </label>
          <input id="guardianPhone" name="guardianPhone" type="tel" className="field" />
        </div>

        <label className="choice choice-wide span-2">
          <input type="checkbox" name="guardianConsent" style={{ marginTop: "0.2rem" }} />
          <span>The parent or guardian consents to this child taking part.</span>
        </label>

        {state.error && (
          <p role="alert" className="notice notice-error span-2">
            {state.error}
          </p>
        )}

        <div className="span-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Registering..." : "Register candidate"}
          </button>
        </div>
      </form>
    </div>
  );
}