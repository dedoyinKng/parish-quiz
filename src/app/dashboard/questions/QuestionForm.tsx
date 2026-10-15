"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Bold, ChevronDown, ChevronUp, Italic, Plus, Trash2 } from "lucide-react";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  countGaps,
  type QuestionContent,
} from "@/lib/questions";
import { COMPETITION_LABEL, LEVEL_LABEL } from "@/lib/levels";

type State = { error?: string; ok?: string; stamp?: number };

export type QuestionSet = {
  seasonId: string;
  seasonName: string;
  competition: string;
  level: string;
};

export type QuestionInitial = {
  type: string;
  prompt: string;
  marks: number;
  explanation: string;
  content: QuestionContent;
};

export default function QuestionForm({
  action,
  set,
  initial,
  submitLabel,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  set: QuestionSet;
  initial?: QuestionInitial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const [resetCount, setResetCount] = useState(0);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (state.ok && state.stamp) setAdded((n) => n + 1);
  }, [state.ok, state.stamp]);

  const setHref = `/dashboard/questions/set?season=${set.seasonId}&competition=${set.competition}&level=${set.level}`;

  return (
    <>
      <div className="setbar">
        <div className="setbar-left">
          <span className="setchip">{set.seasonName}</span>
          <span className="setchip">
            {COMPETITION_LABEL[set.competition as keyof typeof COMPETITION_LABEL]}
          </span>
          <span className="setchip">
            {LEVEL_LABEL[set.level as keyof typeof LEVEL_LABEL]}
          </span>
        </div>
        <div className="setbar-right">
          {!initial && (
            <span>
              Added this visit: <strong>{added}</strong>
            </span>
          )}
          <Link href={setHref} className="linkbtn">
            View questions in this set
          </Link>
        </div>
      </div>

      <Inner
        key={initial ? "edit" : `${state.stamp ?? 0}-${resetCount}`}
        initial={initial}
        set={set}
        state={state}
        formAction={formAction}
        pending={pending}
        submitLabel={submitLabel}
        onReset={initial ? undefined : () => setResetCount((n) => n + 1)}
      />
    </>
  );
}

const split = (s: string) =>
  s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Inner({
  initial,
  set,
  state,
  formAction,
  pending,
  submitLabel,
  onReset,
}: {
  initial?: QuestionInitial;
  set: QuestionSet;
  state: State;
  formAction: (formData: FormData) => void;
  pending: boolean;
  submitLabel: string;
  onReset?: () => void;
}) {
  const c = initial?.content ?? {};

  const [type, setType] = useState(initial?.type ?? "SINGLE_CHOICE");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [options, setOptions] = useState<string[]>(c.options ?? ["", ""]);
  const [single, setSingle] = useState<number>(
    typeof c.correct === "number" ? c.correct : 0
  );
  const [multi, setMulti] = useState<number[]>(
    Array.isArray(c.correct) ? c.correct : []
  );
  const [tf, setTf] = useState<boolean>(
    typeof c.correct === "boolean" ? c.correct : true
  );
  const [gaps, setGaps] = useState<string[]>(
    c.gaps ? c.gaps.map((g) => g.join("; ")) : []
  );
  const [required, setRequired] = useState<number>(c.required ?? 1);
  const [pool, setPool] = useState<string[]>(c.answers ?? ["", ""]);
  const [pairs, setPairs] = useState<{ left: string; right: string }[]>(
    c.pairs ?? [
      { left: "", right: "" },
      { left: "", right: "" },
    ]
  );
  const [items, setItems] = useState<string[]>(c.items ?? ["", ""]);

  const gapCount = countGaps(prompt);
  const gapAnswers = Array.from({ length: gapCount }, (_, i) => gaps[i] ?? "");
  const instructionsMode = type === "MATCHING" || type === "SEQUENCE";

  function wrap(mark: string) {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const next = prompt.slice(0, s) + mark + prompt.slice(s, e) + mark + prompt.slice(e);
    setPrompt(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + mark.length, e + mark.length);
    });
  }

  function removeOption(i: number) {
    setOptions((o) => o.filter((_, j) => j !== i));
    setSingle((s) => (s === i ? 0 : s > i ? s - 1 : s));
    setMulti((m) => m.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  }

  let content: unknown = {};
  switch (type) {
    case "SINGLE_CHOICE":
      content = { options, correct: single };
      break;
    case "MULTIPLE_CHOICE":
      content = { options, correct: multi };
      break;
    case "TRUE_FALSE":
      content = { correct: tf };
      break;
    case "FILL_IN_GAP":
      content = { gaps: gapAnswers.map(split) };
      break;
    case "MULTIPLE_SHORT_ANSWER":
      content = { required, answers: pool };
      break;
    case "MATCHING":
      content = { pairs };
      break;
    case "SEQUENCE":
      content = { items };
      break;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="seasonId" value={set.seasonId} />
      <input type="hidden" name="competition" value={set.competition} />
      <input type="hidden" name="level" value={set.level} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />

      <div className="qcard">
        <h2>Question details</h2>
        <p className="sub">&nbsp;</p>

        <div className="q2">
          <div className="qfield">
            <label htmlFor="type" className="qlabel">
              Question Type <span className="star">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="field"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="qfield">
            <label htmlFor="marks" className="qlabel">
              Marks <span className="star">*</span>
            </label>
            <input
              id="marks"
              name="marks"
              type="number"
              min={1}
              max={10}
              defaultValue={initial?.marks ?? 1}
              required
              className="field"
            />
          </div>
        </div>

        <div className="qfield">
          <label htmlFor="prompt" className="qlabel">
            {instructionsMode ? "Instructions for student" : "Question stem"}{" "}
            <span className="star">*</span>
          </label>
          {type === "SEQUENCE" && (
            <span className="muted">
              State clearly how items should be ordered (e.g. chronological order,
              process steps, or ranking).
            </span>
          )}
          {type === "MATCHING" && (
            <span className="muted">Explain how students should match the items.</span>
          )}
          {type === "FILL_IN_GAP" && (
            <span className="muted">
              Type ___ (three underscores) where each gap goes, for example: God
              is ___ and Jesus is ___.
            </span>
          )}
          <div className="rte">
            <div className="rte-bar">
              <button type="button" className="rte-btn" onClick={() => wrap("**")} aria-label="Bold">
                <Bold size={16} />
              </button>
              <button type="button" className="rte-btn" onClick={() => wrap("*")} aria-label="Italic">
                <Italic size={16} />
              </button>
            </div>
            <textarea
              id="prompt"
              name="prompt"
              ref={taRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your question text here..."
              required
            />
          </div>
        </div>
      </div>

      {(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (
        <div className="qcard">
          <h2>
            Answer options <span className="star">*</span>
          </h2>
          <p className="sub">
            {type === "SINGLE_CHOICE"
              ? "Select the radio button to mark the correct answer."
              : "Tick every correct answer."}
          </p>
          <div className="optgrid">
            {options.map((o, i) => (
              <div key={i} className="optbox">
                {type === "SINGLE_CHOICE" ? (
                  <input
                    type="radio"
                    checked={single === i}
                    onChange={() => setSingle(i)}
                    aria-label={`Option ${i + 1} is correct`}
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={multi.includes(i)}
                    onChange={() =>
                      setMulti((m) =>
                        m.includes(i) ? m.filter((x) => x !== i) : [...m, i]
                      )
                    }
                    aria-label={`Option ${i + 1} is correct`}
                  />
                )}
                <input
                  className="field"
                  value={o}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  onChange={(e) =>
                    setOptions((opts) =>
                      opts.map((x, j) => (j === i ? e.target.value : x))
                    )
                  }
                />
                <button
                  type="button"
                  className="iconbtn danger"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 2}
                  aria-label="Remove option"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="addbtn"
            onClick={() => setOptions((o) => [...o, ""])}
            disabled={options.length >= 8}
          >
            <Plus size={16} /> Add option
          </button>
        </div>
      )}

      {type === "TRUE_FALSE" && (
        <div className="qcard">
          <h2>
            Correct answer <span className="star">*</span>
          </h2>
          <p className="sub">Select whether the statement is true or false.</p>
          <div className="choice-group">
            <label className="choice">
              <input type="radio" checked={tf} onChange={() => setTf(true)} />
              True
            </label>
            <label className="choice">
              <input type="radio" checked={!tf} onChange={() => setTf(false)} />
              False
            </label>
          </div>
        </div>
      )}

      {type === "FILL_IN_GAP" && (
        <div className="qcard">
          <h2>
            Gap answers <span className="star">*</span>
          </h2>
          {gapCount === 0 ? (
            <p className="sub">
              Add ___ to the question above. A row appears here for each gap.
            </p>
          ) : (
            <>
              <p className="sub">
                Accepted answers for each gap. Separate alternatives with a
                semicolon.
              </p>
              {gapAnswers.map((g, i) => (
                <div key={i} className="mrow">
                  <span className="numdot">{i + 1}</span>
                  <input
                    className="field"
                    value={g}
                    placeholder="e.g. good; kind"
                    onChange={(e) =>
                      setGaps((prev) => {
                        const next = Array.from({ length: gapCount }, (_, k) => prev[k] ?? "");
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {type === "MULTIPLE_SHORT_ANSWER" && (
        <div className="qcard">
          <h2>
            Answer requirements <span className="star">*</span>
          </h2>
          <p className="sub">
            Set how many answers the student must give, and list all acceptable
            answers. The student will see exactly that many answer boxes; order
            does not matter and duplicates are not allowed.
          </p>

          <div className="qfield">
            <label htmlFor="required" className="qlabel">
              Number of answers required <span className="star">*</span>
            </label>
            <input
              id="required"
              type="number"
              min={1}
              max={10}
              value={required}
              onChange={(e) => setRequired(Number(e.target.value) || 1)}
              className="field"
              style={{ maxWidth: "16rem" }}
            />
          </div>

          <div className="qfield">
            <span className="qlabel">
              Acceptable answers list <span className="star">*</span>
            </span>
            <span className="muted">
              Add all correct/acceptable answers. The list must have at least as
              many entries as the number required above.
            </span>
          </div>
          {pool.map((a, i) => (
            <div key={i} className="mrow">
              <strong>{i + 1}.</strong>
              <input
                className="field"
                value={a}
                placeholder="Acceptable answer"
                onChange={(e) =>
                  setPool((prev) =>
                    prev.map((x, j) => (j === i ? e.target.value : x))
                  )
                }
              />
              <button
                type="button"
                className="iconbtn danger"
                onClick={() => setPool((prev) => prev.filter((_, j) => j !== i))}
                disabled={pool.length <= 1}
                aria-label="Remove answer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="addbtn"
            onClick={() => setPool((prev) => [...prev, ""])}
            disabled={pool.length >= 20}
          >
            <Plus size={16} /> Add acceptable answer
          </button>
        </div>
      )}

      {type === "MATCHING" && (
        <div className="qcard">
          <h2>
            Pairs configuration <span className="star">*</span>
          </h2>
          <p className="sub">Define pairs: Column A (item) and Column B (match).</p>
          <div className="pairtable">
            <div className="pairrow pairhead">
              <span>#</span>
              <span>Column A (item)</span>
              <span>Column B (match)</span>
              <span>Action</span>
            </div>
            {pairs.map((p, i) => (
              <div key={i} className="pairrow">
                <span>{i + 1}</span>
                <input
                  className="field"
                  value={p.left}
                  placeholder="Item"
                  onChange={(e) =>
                    setPairs((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, left: e.target.value } : x))
                    )
                  }
                />
                <input
                  className="field"
                  value={p.right}
                  placeholder="Match"
                  onChange={(e) =>
                    setPairs((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, right: e.target.value } : x))
                    )
                  }
                />
                <button
                  type="button"
                  className="iconbtn danger"
                  onClick={() => setPairs((prev) => prev.filter((_, j) => j !== i))}
                  disabled={pairs.length <= 2}
                  aria-label="Remove pair"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="addbtn"
            onClick={() => setPairs((prev) => [...prev, { left: "", right: "" }])}
            disabled={pairs.length >= 8}
          >
            <Plus size={16} /> Add new pair
          </button>
        </div>
      )}

      {type === "SEQUENCE" && (
        <div className="qcard">
          <h2>
            Items in correct order <span className="star">*</span>
          </h2>
          <p className="sub">
            List each item in the correct sequence from first to last. Students
            will see them shuffled and must rearrange them.
          </p>
          {items.map((it, i) => (
            <div key={i} className="seqrow">
              <span className="numdot">{i + 1}</span>
              <input
                className="field"
                value={it}
                placeholder={`Item ${i + 1}`}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x, j) => (j === i ? e.target.value : x))
                  )
                }
              />
              <div className="seqbtns">
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => setItems((prev) => move(prev, i, -1))}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => setItems((prev) => move(prev, i, 1))}
                  disabled={i === items.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <button
                type="button"
                className="iconbtn danger"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                disabled={items.length <= 2}
                aria-label="Remove item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="addbtn"
            onClick={() => setItems((prev) => [...prev, ""])}
            disabled={items.length >= 8}
          >
            <Plus size={16} /> Add item
          </button>
        </div>
      )}

      <div className="qcard">
        <h2>Explanation (optional)</h2>
        <p className="sub">Shown when answers are reviewed after the exam, if you choose to show them.</p>
        <textarea
          id="explanation"
          name="explanation"
          defaultValue={initial?.explanation ?? ""}
          className="field"
          style={{ minHeight: "4rem" }}
        />
      </div>

      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.ok && <p className="notice">{state.ok}</p>}

      <div className="form-actions">
        {onReset ? (
          <button type="button" className="btn-ghost" onClick={onReset}>
            Reset form
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}