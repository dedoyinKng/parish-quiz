"use client";

import { useActionState, useState } from "react";
import { createUserAction } from "./actions";

type RoleOpt = { value: string; label: string; unitType: string };
type Unit = { id: string; type: string; name: string; code: string };

export default function CreateUserForm({
  roles,
  units,
}: {
  roles: RoleOpt[];
  units: Unit[];
}) {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    {} as { error?: string; ok?: string; email?: string; password?: string }
  );
  const [role, setRole] = useState(roles[0]?.value ?? "");

  const unitType = roles.find((r) => r.value === role)?.unitType;
  const options = units.filter((u) => u.type === unitType);

  return (
    <div>
      <form action={formAction} key={state.ok ?? "form"} className="form-grid">
        <div className="span-2">
          <label htmlFor="new-name" className="label">
            Full name
          </label>
          <input id="new-name" name="name" required className="field" />
        </div>
        <div>
          <label htmlFor="new-email" className="label">
            Email (used to sign in)
          </label>
          <input id="new-email" name="email" type="email" required className="field" />
        </div>
        <div>
          <label htmlFor="new-phone" className="label">
            Phone (optional)
          </label>
          <input id="new-phone" name="phone" type="tel" className="field" />
        </div>
        <div>
          <label htmlFor="new-role" className="label">
            Role
          </label>
          <select
            id="new-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="field"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {unitType ? (
          <div>
            <label htmlFor="new-unit" className="label">
              Unit ({unitType.toLowerCase()})
            </label>
            <select key={role} id="new-unit" name="unitId" required className="field">
              <option value="">Select...</option>
              {options.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <span className="label">Unit</span>
            <p className="muted" style={{ paddingTop: "0.5rem" }}>
              Not tied to a parish, area, zone or province.
            </p>
          </div>
        )}

        {state.error && (
          <p role="alert" className="notice notice-error span-2">
            {state.error}
          </p>
        )}

        <div className="span-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>

      {state.password && (
        <div className="notice mt-4">
          <p style={{ fontWeight: 600 }}>{state.ok}</p>
          <p className="mt-1">
            Email: <code>{state.email}</code>
          </p>
          <p>
            Temporary password: <code style={{ fontWeight: 700 }}>{state.password}</code>
          </p>
          <p className="muted mt-1">
            Copy this now. It is shown only once. They can change it under
            Password after signing in.
          </p>
        </div>
      )}
    </div>
  );
}