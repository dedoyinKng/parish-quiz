"use client";

import { useActionState, useState } from "react";
import { COMPETITION_LABEL, LEVELS, LEVEL_LABEL } from "@/lib/levels";
import { EXAM_COMPETITIONS, STAGE_LABEL } from "@/lib/exams";

type State = { error?: string };
type Stage = "PARISH" | "AREA" | "ZONE" | "PROVINCE";

export type UnitOption = { id: string; name: string; type: Stage };

export type ExamInitial = {
  unitLabel: string;
  competition: string;
  level: string;
  startsAt: string;
  durationMinutes: number;
  questionCount: number | null;
};

const STAGE_ORDER: Stage[] = ["PARISH", "AREA", "ZONE", "PROVINCE"];
const STAGE_PLURAL: Record<Stage, string> = {
  PARISH: "parishes",
  AREA: "areas",
  ZONE: "zones",
  PROVINCE: "provinces",
};

export default function ExamForm({
  action,
  units,
  initial,
  submitLabel,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  units: UnitOption[];
  initial?: ExamInitial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const stages = STAGE_ORDER.filter((s) => units.some((u) => u.type === s));
  const [stage, setStage] = useState<Stage | "">(
    stages.length === 1 ? stages[0] : ""
  );
  const stageUnits = units
    .filter((u) => u.type === stage)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <form action={formAction}>
      <div className="qcard">
        <h2>{initial ? "Competition" : "Which competition?"}</h2>
        <p className="sub">
          {initial
            ? "The stage, unit, quiz and category cannot be changed. Delete the competition and create a new one to change them."
            : "Choose the stage, the unit (or all units of that stage), the quiz and the category."}
        </p>

        {initial ? (
          <div className="setbar-left">
            <span className="setchip">{initial.unitLabel}</span>
            <span className="setchip">
              {COMPETITION_LABEL[initial.competition as keyof typeof COMPETITION_LABEL]}
            </span>
            <span className="setchip">
              {LEVEL_LABEL[initial.level as keyof typeof LEVEL_LABEL]}
            </span>
          </div>
        ) : (
          <>
            <div className="q2">
              <div className="qfield">
                <label htmlFor="stage" className="qlabel">
                  Stage <span className="star">*</span>
                </label>
                <select
                  id="stage"
                  name="stage"
                  className="field"
                  required
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage | "")}
                >
                  {stages.length !== 1 && <option value="">Select...</option>}
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABEL[s]} stage
                    </option>
                  ))}
                </select>
              </div>
              <div className="qfield">
                <label htmlFor="unitId" className="qlabel">
                  {stage ? STAGE_LABEL[stage] : "Unit"} <span className="star">*</span>
                </label>
                <select
                  key={stage}
                  id="unitId"
                  name="unitId"
                  className="field"
                  required
                  defaultValue=""
                  disabled={!stage}
                >
                  <option value="">{stage ? "Select..." : "Choose a stage first"}</option>
                  {stage && stageUnits.length > 1 && (
                    <option value="ALL">
                      All {STAGE_PLURAL[stage]} ({stageUnits.length})
                    </option>
                  )}
                  {stageUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="q2" style={{ marginTop: "1rem" }}>
              <div className="qfield">
                <label htmlFor="competition" className="qlabel">
                  Quiz <span className="star">*</span>
                </label>
                <select id="competition" name="competition" className="field" required defaultValue="">
                  <option value="">Select...</option>
                  {EXAM_COMPETITIONS.map((c) => (
                    <option key={c} value={c}>
                      {COMPETITION_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="qfield">
                <label htmlFor="level" className="qlabel">
                  Category (age group) <span className="star">*</span>
                </label>
                <select id="level" name="level" className="field" required defaultValue="">
                  <option value="">Select...</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABEL[l]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="qcard">
        <h2>Schedule</h2>
        <p className="sub">
          Candidates cannot enter before the start time. All times are West Africa Time (WAT).
        </p>
        <div className="q3">
          <div className="qfield">
            <label htmlFor="startsAt" className="qlabel">
              Date and time <span className="star">*</span>
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              className="field"
              required
              defaultValue={initial?.startsAt ?? ""}
            />
          </div>
          <div className="qfield">
            <label htmlFor="durationMinutes" className="qlabel">
              Duration in minutes <span className="star">*</span>
            </label>
            <input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={5}
              max={180}
              className="field"
              required
              defaultValue={initial?.durationMinutes ?? 30}
            />
          </div>
          <div className="qfield">
            <label htmlFor="questionCount" className="qlabel">
              Number of questions
            </label>
            <input
              id="questionCount"
              name="questionCount"
              type="number"
              min={1}
              max={200}
              className="field"
              placeholder="Leave blank to use all"
              defaultValue={initial?.questionCount ?? ""}
            />
          </div>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}

      <div className="form-actions">
        <span />
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
