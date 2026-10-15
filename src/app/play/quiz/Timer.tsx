"use client";

import { useEffect, useState } from "react";

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function Timer({
  endsAt,
  serverNow,
}: {
  endsAt: string;
  serverNow: string;
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const offset = new Date(serverNow).getTime() - Date.now();
    const tick = () =>
      setLeft(Math.max(0, new Date(endsAt).getTime() - (Date.now() + offset)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt, serverNow]);

  const low = left !== null && left < 60_000;
  return (
    <span className={`timer-pill${low ? " timer-low" : ""}`}>
      {left === null ? "--:--" : left === 0 ? "Time is up" : fmt(left)}
    </span>
  );
}
