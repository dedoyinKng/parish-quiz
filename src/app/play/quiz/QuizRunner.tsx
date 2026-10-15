"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PlayQuestion } from "@/lib/quiz";
import { saveAnswerAction, submitQuizAction } from "./actions";

// **bold** and *italic* typed by the question writer
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.length > 4 && p.startsWith("**") && p.endsWith("**"))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.length > 2 && p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function isAnswered(q: PlayQuestion, a: unknown): boolean {
  switch (q.type) {
    case "SINGLE_CHOICE":
      return typeof a === "number";
    case "MULTIPLE_CHOICE":
      return Array.isArray(a) && a.length > 0;
    case "TRUE_FALSE":
      return typeof a === "boolean";
    case "FILL_IN_GAP":
    case "MULTIPLE_SHORT_ANSWER":
      return Array.isArray(a) && a.some((x) => String(x ?? "").trim() !== "");
    case "MATCHING":
      return Array.isArray(a) && a.some((x) => typeof x === "number");
    case "SEQUENCE":
      return Array.isArray(a);
    default:
      return false;
  }
}

function QuestionBody({
  q,
  a,
  onChange,
}: {
  q: PlayQuestion;
  a: unknown;
  onChange: (v: unknown, delay?: number) => void;
}) {
  const prompt = <p className="qprompt">{rich(q.prompt)}</p>;

  switch (q.type) {
    case "SINGLE_CHOICE":
      return (
        <>
          {prompt}
          {(q.options ?? []).map((o) => (
            <label key={o.i} className={`qopt${a === o.i ? " on" : ""}`}>
              <input
                type="radio"
                name={q.id}
                checked={a === o.i}
                onChange={() => onChange(o.i)}
              />
              <span>{o.text}</span>
            </label>
          ))}
        </>
      );

    case "MULTIPLE_CHOICE": {
      const sel = Array.isArray(a) ? (a as number[]) : [];
      return (
        <>
          {prompt}
          <p className="qhint">Choose all that apply.</p>
          {(q.options ?? []).map((o) => {
            const on = sel.includes(o.i);
            return (
              <label key={o.i} className={`qopt${on ? " on" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange(on ? sel.filter((x) => x !== o.i) : [...sel, o.i])
                  }
                />
                <span>{o.text}</span>
              </label>
            );
          })}
        </>
      );
    }

    case "TRUE_FALSE":
      return (
        <>
          {prompt}
          {[
            { v: true, t: "True" },
            { v: false, t: "False" },
          ].map((o) => (
            <label key={o.t} className={`qopt${a === o.v ? " on" : ""}`}>
              <input
                type="radio"
                name={q.id}
                checked={a === o.v}
                onChange={() => onChange(o.v)}
              />
              <span>{o.t}</span>
            </label>
          ))}
        </>
      );

    case "FILL_IN_GAP": {
      const n = q.gaps ?? 0;
      const vals = Array.from({ length: n }, (_, i) =>
        Array.isArray(a) ? String((a as unknown[])[i] ?? "") : ""
      );
      const parts = q.prompt.split("___");
      return (
        <p className="qprompt">
          {parts.map((p, i) => (
            <Fragment key={i}>
              {rich(p)}
              {i < parts.length - 1 && (
                <input
                  className="gapinput"
                  value={vals[i] ?? ""}
                  autoComplete="off"
                  aria-label={`Gap ${i + 1}`}
                  onChange={(e) => {
                    const next = [...vals];
                    next[i] = e.target.value;
                    onChange(next, 500);
                  }}
                />
              )}
            </Fragment>
          ))}
        </p>
      );
    }

    case "MULTIPLE_SHORT_ANSWER": {
      const n = q.required ?? 1;
      const vals = Array.from({ length: n }, (_, i) =>
        Array.isArray(a) ? String((a as unknown[])[i] ?? "") : ""
      );
      return (
        <>
          {prompt}
          <p className="qhint">
            Give {n} different answer{n === 1 ? "" : "s"}. The order does not matter.
          </p>
          {vals.map((v, i) => (
            <div key={i} className="ansrow">
              <span className="numdot">{i + 1}</span>
              <input
                className="field"
                value={v}
                autoComplete="off"
                placeholder="Type your answer"
                onChange={(e) => {
                  const next = [...vals];
                  next[i] = e.target.value;
                  onChange(next, 500);
                }}
              />
            </div>
          ))}
        </>
      );
    }

    case "MATCHING": {
      const lefts = q.lefts ?? [];
      const vals: (number | null)[] = lefts.map((_, i) =>
        Array.isArray(a) && typeof (a as unknown[])[i] === "number"
          ? ((a as number[])[i] as number)
          : null
      );
      return (
        <>
          {prompt}
          {lefts.map((l, i) => (
            <div key={i} className="matchrow">
              <span className="matchleft">{l}</span>
              <select
                className="field"
                value={vals[i] === null ? "" : String(vals[i])}
                onChange={(e) => {
                  const next = [...vals];
                  next[i] = e.target.value === "" ? null : Number(e.target.value);
                  onChange(next);
                }}
              >
                <option value="">Choose the match...</option>
                {(q.rights ?? []).map((r) => (
                  <option key={r.i} value={r.i}>
                    {r.text}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </>
      );
    }

    case "SEQUENCE": {
      const items = q.items ?? [];
      const order: number[] =
        Array.isArray(a) && (a as number[]).length === items.length
          ? (a as number[])
          : items.map((x) => x.i);
      const text = new Map(items.map((x) => [x.i, x.text]));
      const move = (pos: number, d: number) => {
        const j = pos + d;
        if (j < 0 || j >= order.length) return;
        const next = [...order];
        [next[pos], next[j]] = [next[j], next[pos]];
        onChange(next);
      };
      return (
        <>
          {prompt}
          <p className="qhint">Use the arrows to put the items in the right order.</p>
          {order.map((id, pos) => (
            <div key={id} className="seqitem">
              <span className="numdot">{pos + 1}</span>
              <span className="txt">{text.get(id)}</span>
              <button
                type="button"
                className="iconbtn"
                onClick={() => move(pos, -1)}
                disabled={pos === 0}
                aria-label="Move up"
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                className="iconbtn"
                onClick={() => move(pos, 1)}
                disabled={pos === order.length - 1}
                aria-label="Move down"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          ))}
        </>
      );
    }

    default:
      return prompt;
  }
}

export default function QuizRunner({
  title,
  name,
  code,
  questions,
  initialAnswers,
  endsAt,
  serverNow,
}: {
  title: string;
  name: string;
  code: string;
  questions: PlayQuestion[];
  initialAnswers: Record<string, unknown>;
  endsAt: string;
  serverNow: string;
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [left, setLeft] = useState<number | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, unknown>>({});
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const done = useRef(false);

  function send(qid: string, val: unknown) {
    setSaving("saving");
    chain.current = chain.current
      .then(() => saveAnswerAction(qid, val))
      .then((r) => {
        setSaving(r.ok ? "saved" : "error");
        if (r.closed) router.refresh();
      })
      .catch(() => setSaving("error"));
  }

  function change(qid: string, val: unknown, delay = 0) {
    setAnswers((a) => ({ ...a, [qid]: val }));
    pending.current[qid] = val;
    clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(() => {
      const v = pending.current[qid];
      delete pending.current[qid];
      send(qid, v);
    }, delay);
  }

  async function flush() {
    for (const qid of Object.keys(pending.current)) {
      clearTimeout(timers.current[qid]);
      const v = pending.current[qid];
      delete pending.current[qid];
      send(qid, v);
    }
    await chain.current;
  }

  async function submit(auto = false) {
    if (done.current) return;
    if (!auto) {
      const unanswered = questions.filter((q) => !isAnswered(q, answers[q.id])).length;
      const msg =
        unanswered > 0
          ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`
          : "Submit your quiz now? You cannot change your answers after this.";
      if (!confirm(msg)) return;
    }
    done.current = true;
    setSubmitting(true);
    await flush();
    await submitQuizAction();
    router.refresh();
  }

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    const offset = new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const ms = new Date(endsAt).getTime() - (Date.now() + offset);
      setLeft(Math.max(0, ms));
      if (ms <= 0) submitRef.current(true);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt, serverNow]);

  async function go(to: number) {
    await flush();
    setIdx(Math.min(Math.max(to, 0), questions.length - 1));
    window.scrollTo({ top: 0 });
  }

  if (questions.length === 0)
    return (
      <div className="quiz-shell">
        <div className="quiz-card">This quiz has no questions.</div>
      </div>
    );

  const q = questions[idx];
  const low = left !== null && left < 60_000;
  const answeredCount = questions.filter((x) => isAnswered(x, answers[x.id])).length;

  return (
    <div className="quiz-shell">
      <div className="quiz-head">
        <div className="who">
          <p className="play-brand" style={{ margin: 0 }}>
            {title}
          </p>
          <strong>{name}</strong> <span className="muted mono">{code}</span>
        </div>
        <span className={`timer-pill${low ? " timer-low" : ""}`}>
          {left === null ? "--:--" : left === 0 ? "Time is up" : fmt(left)}
        </span>
      </div>

      <div className="quiz-card">
        <div className="qcount">
          Question {idx + 1} of {questions.length} · {q.marks} mark{q.marks === 1 ? "" : "s"}
        </div>

        <QuestionBody
          key={q.id}
          q={q}
          a={answers[q.id]}
          onChange={(v, delay) => change(q.id, v, delay ?? 0)}
        />

        <div className="quiz-nav">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => go(idx - 1)}
            disabled={idx === 0 || submitting}
          >
            Previous
          </button>
          <span className="savestate">
            {saving === "saving" && "Saving..."}
            {saving === "saved" && "Saved"}
            {saving === "error" && "Could not save. Check your connection."}
          </span>
          {idx < questions.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => go(idx + 1)}
              disabled={submitting}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => submit(false)}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit quiz"}
            </button>
          )}
        </div>
      </div>

      <div className="quiz-card" style={{ marginTop: "1rem" }}>
        <div className="qcount">
          {answeredCount} of {questions.length} answered
        </div>
        <div className="qdots">
          {questions.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className={`qdot${isAnswered(x, answers[x.id]) ? " done" : ""}${i === idx ? " cur" : ""}`}
              onClick={() => go(i)}
              disabled={submitting}
              aria-label={`Go to question ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => submit(false)}
            disabled={submitting}
          >
            Submit quiz
          </button>
        </div>
      </div>
    </div>
  );
}
