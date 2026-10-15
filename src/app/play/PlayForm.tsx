"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { playLoginAction } from "./actions";

type State = {
  error?: string;
  waiting?: { opensAt: string; serverNow: string; title: string };
};

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function Countdown({
  opensAt,
  serverNow,
  onZero,
}: {
  opensAt: string;
  serverNow: string;
  onZero: () => void;
}) {
  const [left, setLeft] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const offset = new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const ms = new Date(opensAt).getTime() - (Date.now() + offset);
      setLeft(ms);
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        onZero();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [opensAt, serverNow, onZero]);

  return <div className="countdown">{left === null ? "--:--" : fmt(left)}</div>;
}

export default function PlayForm() {
  const [state, formAction, pending] = useActionState(playLoginAction, {} as State);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction}>
      <div className="qfield">
        <label htmlFor="code" className="qlabel">
          Candidate ID
        </label>
        <input
          id="code"
          name="code"
          className="field"
          placeholder="e.g. ABC-123"
          autoComplete="off"
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
      </div>
      <div className="qfield">
        <label htmlFor="pin" className="qlabel">
          PIN from your teacher
        </label>
        <input
          id="pin"
          name="pin"
          className="field"
          placeholder="6 digits"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}

      {state.waiting && (
        <div className="waitbox">
          <strong>{state.waiting.title}</strong>
          <span>The quiz has not started yet. It opens in</span>
          <Countdown
            opensAt={state.waiting.opensAt}
            serverNow={state.waiting.serverNow}
            onZero={() => formRef.current?.requestSubmit()}
          />
          <span className="muted">Keep this page open. You will go in automatically.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
        style={{ width: "100%", marginTop: ".5rem" }}
      >
        {pending ? "Checking..." : state.waiting ? "Check again" : "Enter quiz"}
      </button>
    </form>
  );
}
