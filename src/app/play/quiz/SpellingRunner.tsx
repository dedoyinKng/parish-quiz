"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAnswerAction, submitQuizAction } from "./actions";
import "./spelling-play.css";

type Word = { id: string; hint: string | null };

const MAX_PLAYS = 3;

export default function SpellingRunner({
  title,
  name,
  code,
  words,
  initialAnswers,
  endsAt,
  serverNow,
}: {
  title: string;
  name: string;
  code: string;
  words: Word[];
  initialAnswers: Record<string, unknown>;
  endsAt: string;
  serverNow: string;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const w of words) {
      const v = initialAnswers[w.id];
      if (typeof v === "string") o[w.id] = v;
    }
    return o;
  });
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [left, setLeft] = useState(() =>
    Math.max(0, Date.parse(endsAt) - Date.parse(serverNow))
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef<{ id: string; val: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);
  const storeKey = `sb-plays-${code}-${endsAt}`;

  // remember replays used, so a refresh does not give extra plays
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (raw) setPlays(JSON.parse(raw));
    } catch {}
  }, [storeKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(plays));
    } catch {}
  }, [plays, storeKey]);

  function enqueue(id: string, val: string) {
    queue.current = queue.current
      .then(() => saveAnswerAction(id, val))
      .then((r) => {
        if (r && (r as { closed?: boolean }).closed) router.refresh();
      })
      .catch(() => {});
  }

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const p = pending.current;
      pending.current = null;
      enqueue(p.id, p.val);
    }
    await queue.current;
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    await flush();
    await submitQuizAction();
    router.refresh();
  }

  // countdown, using the server's clock
  useEffect(() => {
    const t = setInterval(() => {
      setLeft(Math.max(0, Date.parse(endsAt) - (Date.now() + offset)));
    }, 500);
    return () => clearInterval(t);
  }, [endsAt, offset]);

  useEffect(() => {
    if (left <= 0 && !finished.current) {
      finished.current = true;
      void finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  function stopAudio() {
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
  }

  async function go(n: number) {
    if (n < 0 || n >= words.length || n === i) return;
    stopAudio();
    setMsg("");
    await flush();
    setI(n);
    setConfirm(false);
  }

  function onType(v: string) {
    const id = words[i].id;
    setAnswers((a) => ({ ...a, [id]: v }));
    pending.current = { id, val: v };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush();
    }, 600);
  }

  function play() {
    const w = words[i];
    const used = plays[w.id] ?? 0;
    if (used >= MAX_PLAYS || playing) return;
    setMsg("");
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(`/api/spelling-audio/${w.id}`);
    audioRef.current = a;
    setPlaying(true);
    setPlays((p) => ({ ...p, [w.id]: used + 1 }));
    const refund = () => {
      setPlaying(false);
      setPlays((p) => ({ ...p, [w.id]: used }));
    };
    a.onended = () => setPlaying(false);
    a.onerror = () => {
      refund();
      setMsg("The word could not be played. Tell your teacher.");
    };
    a.play().catch(() => {
      refund();
      setMsg("The word could not be played. Check your headset and try again.");
    });
  }

  const w = words[i];
  const used = plays[w.id] ?? 0;
  const playsLeft = Math.max(0, MAX_PLAYS - used);
  const answered = words.filter((x) => (answers[x.id] ?? "").trim() !== "").length;
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="sb-wrap">
      <div className="sb-top">
        <div>
          <div className="sb-title">{title}</div>
          <div className="sb-who">
            {name} · {code}
          </div>
        </div>
        <div className={`sb-timer${left < 60000 ? " low" : ""}`}>
          {mm}:{ss}
        </div>
      </div>

      <div className="sb-nav">
        {words.map((x, n) => (
          <button
            key={x.id}
            type="button"
            className={`sb-dot${(answers[x.id] ?? "").trim() ? " done" : ""}${n === i ? " cur" : ""}`}
            onClick={() => void go(n)}
          >
            {n + 1}
          </button>
        ))}
      </div>

      <div className="sb-card">
        <div className="sb-count">
          Word {i + 1} of {words.length}
        </div>

        <button
          type="button"
          className={`sb-play${playing ? " on" : ""}`}
          onClick={play}
          disabled={playing || playsLeft === 0}
        >
          <span aria-hidden>{playing ? "🔊" : "▶"}</span>
          {playing ? "Playing…" : used === 0 ? "Play the word" : "Play again"}
        </button>
        <div className="sb-plays">
          {playsLeft === 0
            ? "No more plays for this word."
            : `${playsLeft} ${playsLeft === 1 ? "play" : "plays"} left for this word`}
        </div>
        {msg && <div className="sb-msg">{msg}</div>}

        {w.hint && (
          <div className="sb-hint">
            <b>Hint</b>
            {w.hint}
          </div>
        )}

        <input
          className="sb-input"
          value={answers[w.id] ?? ""}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void go(i + 1);
            }
          }}
          placeholder="Type the spelling here"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Type the spelling"
        />
      </div>

      <div className="sb-foot">
        <button type="button" className="sb-btn" onClick={() => void go(i - 1)} disabled={i === 0}>
          ← Back
        </button>
        {i < words.length - 1 ? (
          <button type="button" className="sb-btn primary" onClick={() => void go(i + 1)}>
            Next →
          </button>
        ) : (
          <button type="button" className="sb-btn primary" onClick={() => setConfirm(true)}>
            Finish
          </button>
        )}
      </div>

      {i < words.length - 1 && (
        <div className="sb-foot" style={{ justifyContent: "center" }}>
          <button type="button" className="sb-btn" onClick={() => setConfirm(true)}>
            Finish and submit
          </button>
        </div>
      )}

      {confirm && (
        <div className="sb-confirm">
          <strong>Submit your answers?</strong>
          <p style={{ margin: ".4rem 0 0" }}>
            You have answered {answered} of {words.length} words.
            {answered < words.length && " Some words are still empty."}
          </p>
          <div className="sb-foot">
            <button type="button" className="sb-btn" onClick={() => setConfirm(false)} disabled={busy}>
              Keep going
            </button>
            <button type="button" className="sb-btn primary" onClick={() => void finish()} disabled={busy}>
              {busy ? "Submitting…" : "Yes, submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
