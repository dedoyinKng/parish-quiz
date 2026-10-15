"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteUnitAction, renameUnitAction, setHqAction } from "./unit-edit-actions";

type Option = { id: string; name: string };

export default function UnitRowActions({
  id,
  type,
  name,
  hqId,
  hqOptions,
}: {
  id: string;
  type: string;
  name: string;
  hqId: string | null;
  hqOptions: Option[];
}) {
  const isParish = type === "PARISH";
  const initial = isParish ? name : (/(\d+)$/.exec(name)?.[1] ?? "");

  const [mode, setMode] = useState<"" | "edit" | "hq">("");
  const [state, formAction, saving] = useActionState(
    renameUnitAction.bind(null, id),
    {} as { error?: string; ok?: string }
  );
  const [hqState, hqAction, savingHq] = useActionState(
    setHqAction.bind(null, id),
    {} as { error?: string; ok?: string }
  );
  const [deleting, startDelete] = useTransition();
  const [delError, setDelError] = useState("");

  useEffect(() => {
    if (state.ok || hqState.ok) setMode("");
  }, [state, hqState]);

  function onDelete() {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDelError("");
    startDelete(async () => {
      const res = await deleteUnitAction(id);
      if (res.error) setDelError(res.error);
    });
  }

  return (
    <span className="ml-3 inline-flex flex-wrap items-center gap-2 align-middle">
      {mode === "" && (
        <>
          <button type="button" className="btn btn-sm" onClick={() => setMode("edit")}>
            Edit
          </button>
          {!isParish && (
            <button type="button" className="btn btn-sm" onClick={() => setMode("hq")}>
              Set HQ
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "var(--danger)" }}
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </>
      )}

      {mode === "edit" && (
        <form action={formAction} className="inline-flex items-center gap-2">
          <input
            name="value"
            defaultValue={initial}
            type={isParish ? "text" : "number"}
            min={isParish ? undefined : 1}
            required
            autoFocus
            aria-label={isParish ? "Parish name" : "Number"}
            className="field"
            style={{ width: isParish ? "14rem" : "6rem", minHeight: "2.25rem" }}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setMode("")}>
            Cancel
          </button>
        </form>
      )}

      {mode === "hq" && (
        <form action={hqAction} className="inline-flex items-center gap-2">
          <select
            name="parishId"
            defaultValue={hqId ?? ""}
            aria-label="HQ parish"
            className="field"
            style={{ width: "14rem", minHeight: "2.25rem" }}
          >
            <option value="">None</option>
            {hqOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={savingHq}>
            {savingHq ? "Saving..." : "Save"}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setMode("")}>
            Cancel
          </button>
        </form>
      )}

      {(state.error || hqState.error || delError) && (
        <span role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
          {state.error || hqState.error || delError}
        </span>
      )}
    </span>
  );
}