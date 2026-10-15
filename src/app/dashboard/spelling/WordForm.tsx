"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { previewVoicesAction, saveWordAction } from "./actions";

type Voice = { id: string; label: string };
type Preview = { id: string; label: string; src: string };
type Msg = { ok: boolean; text: string } | null;

/** "Nigerian English · male (Abeo)" -> { name: "Abeo", sub: "Nigerian English · male" } */
function splitLabel(label: string) {
  const m = label.match(/^(.*)\s\((.+)\)$/);
  return m ? { name: m[2], sub: m[1] } : { name: label, sub: "" };
}

export default function WordForm({
  seasonId,
  level,
  levelLabel,
  voices,
  defaultVoice,
}: {
  seasonId: string;
  level: string;
  levelLabel: string;
  voices: Voice[];
  defaultVoice: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"tts" | "rec">("tts");
  const [word, setWord] = useState("");
  const [sentence, setSentence] = useState("");
  const [hint, setHint] = useState("");
  const [voice, setVoice] = useState(defaultVoice);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [rec, setRec] = useState<"idle" | "recording" | "done">("idle");
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  function play(src: string) {
    if (player.current) player.current.pause();
    const a = new Audio(src);
    player.current = a;
    void a.play();
  }

  function stopRec() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (mr.current && mr.current.state !== "inactive") mr.current.stop();
  }

  async function startRec() {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        setBlob(b);
        setBlobUrl(URL.createObjectURL(b));
        setRec("done");
      };
      mr.current = r;
      r.start();
      const t0 = Date.now();
      setSecs(0);
      setRec("recording");
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setSecs(Math.min(s, 30));
        if (s >= 30) stopRec();
      }, 250);
    } catch {
      setMsg({
        ok: false,
        text: "Could not use the microphone. Allow microphone access in the browser and try again.",
      });
    }
  }

  function resetRec() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlob(null);
    setBlobUrl(null);
    setRec("idle");
    setSecs(0);
  }

  async function preview() {
    if (!word.trim()) {
      setMsg({ ok: false, text: "Type the word first." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await previewVoicesAction(word, sentence);
    setBusy(false);
    if (r.ok) setPreviews(r.previews);
    else setMsg({ ok: false, text: r.error });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData();
    fd.set("seasonId", seasonId);
    fd.set("level", level);
    fd.set("word", word);
    fd.set("sentence", sentence);
    fd.set("hint", hint);
    fd.set("mode", mode);
    fd.set("voice", voice);
    if (mode === "rec") {
      if (!blob) {
        setMsg({ ok: false, text: "Record the word first." });
        return;
      }
      fd.set("audio", blob, "recording");
    }
    setBusy(true);
    const r = await saveWordAction(fd);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) {
      setWord("");
      setSentence("");
      setHint("");
      setPreviews([]);
      resetRec();
      router.refresh();
    }
  }

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <form onSubmit={save}>
      <div className="wf-modes">
        <button
          type="button"
          className={`wf-mode${mode === "tts" ? " on" : ""}`}
          onClick={() => setMode("tts")}
        >
          Text only
        </button>
        <button
          type="button"
          className={`wf-mode${mode === "rec" ? " on" : ""}`}
          onClick={() => setMode("rec")}
        >
          Audio + text
        </button>
      </div>
      <p className="wf-modehelp">
        {mode === "tts"
          ? "A computer voice reads the word. Choose from four voices."
          : "Record your own voice saying the word (up to 30 seconds)."}
      </p>

      <h3 className="wf-sec">
        <span>01</span> Spelling word details · {levelLabel}
      </h3>
      <div className="wf-grid2">
        <div className="wf-field">
          <label htmlFor="wf-word">Target word *</label>
          <input
            id="wf-word"
            className="wf-input"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. Necessary"
            maxLength={60}
            required
          />
        </div>
        <div className="wf-field">
          <label htmlFor="wf-sentence">Sentence (optional)</label>
          <input
            id="wf-sentence"
            className="wf-input"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="Read aloud between the two spellings"
          />
        </div>
      </div>

      {mode === "tts" ? (
        <>
          <h3 className="wf-sec">
            <span>02</span> Pronunciation
          </h3>
          <div className="wf-prevrow">
            <button type="button" className="btn" onClick={preview} disabled={busy}>
              {busy ? "Please wait…" : "Preview voices"}
            </button>
            <span className="wf-hint">Hear all four voices before saving, then choose one.</span>
          </div>

          {previews.length > 0 ? (
            <div className="wf-voices">
              {previews.map((p) => {
                const { name, sub } = splitLabel(p.label);
                return (
                  <div
                    key={p.id}
                    className={`wf-voice${voice === p.id ? " on" : ""}`}
                    onClick={() => setVoice(p.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <span>
                      <b>{name}</b>
                      <small>{sub}</small>
                    </span>
                    <button
                      type="button"
                      className="wf-play"
                      aria-label={`Play ${name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        play(p.src);
                        setVoice(p.id);
                      }}
                    >
                      ▶
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="wf-voices">
              {voices.map((v) => {
                const { name, sub } = splitLabel(v.label);
                return (
                  <div
                    key={v.id}
                    className={`wf-voice${voice === v.id ? " on" : ""}`}
                    onClick={() => setVoice(v.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <span>
                      <b>{name}</b>
                      <small>{sub}</small>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="wf-sec">
            <span>02</span> Voice recording
          </h3>
          <div className="wf-rec">
            <div className="wf-rec-row">
              {rec !== "recording" ? (
                <button type="button" className="wf-mic" onClick={startRec} aria-label="Start recording">
                  ●
                </button>
              ) : (
                <button type="button" className="wf-mic live" onClick={stopRec} aria-label="Stop recording">
                  ■
                </button>
              )}
              <span className="wf-time">
                {mm}:{ss} / 00:30
              </span>
              {rec === "done" && blobUrl && (
                <>
                  <audio controls src={blobUrl} style={{ height: 34 }} />
                  <button type="button" className="btn" onClick={resetRec}>
                    Record again
                  </button>
                </>
              )}
            </div>
            <p className="wf-hint" style={{ marginTop: ".7rem" }}>
              Tip: say the word alone, then a sentence, then the word again. Speak slowly and clearly.
            </p>
          </div>
        </>
      )}

      <h3 className="wf-sec">
        <span>03</span> Contextual hint
      </h3>
      <div className="wf-field">
        <textarea
          id="wf-hint"
          className="wf-input"
          rows={3}
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Provide the meaning of the word as a hint. Do not include the word itself."
        />
      </div>

      <div className="wf-foot">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : "Save word"}
        </button>
      </div>

      {msg && <div className={msg.ok ? "wf-ok" : "wf-bad"}>{msg.text}</div>}
    </form>
  );
}
