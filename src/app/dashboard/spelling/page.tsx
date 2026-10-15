import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { seasonNameFor } from "@/lib/season";
import { LEVEL_LABEL } from "@/lib/levels";
import { DEFAULT_VOICE, VOICES } from "@/lib/tts";
import { addWordsAction, deleteWordAction, generateAudioAction } from "./actions";
import WordForm from "./WordForm";
import "./spelling.css";

export const maxDuration = 60;

export default async function SpellingPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; msg?: string; season?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "QUESTION_UPLOADER") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const levels = Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[];
  const level = levels.includes(sp.level as keyof typeof LEVEL_LABEL)
    ? (sp.level as keyof typeof LEVEL_LABEL)
    : levels[0];

  const seasons = await db.season.findMany({ orderBy: { createdAt: "desc" } });
  const season = seasons.find((s) => s.id === sp.season) ?? seasons.find((s) => s.name === seasonNameFor()) ?? seasons[0];
  if (!season) {
    return (
      <div className="qwide">
        <h1>Spelling Bee words</h1>
        <p className="muted">Create a season first.</p>
      </div>
    );
  }

  const [words, counts] = await Promise.all([
    db.spellingWord.findMany({
      where: { seasonId: season.id, level: level as never },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        word: true,
        sentence: true,
        hint: true,
        audioAt: true,
        audioVoice: true,
        audioSource: true,
      },
    }),
    db.spellingWord.groupBy({
      by: ["level"],
      where: { seasonId: season.id },
      _count: { _all: true },
    }),
  ]);
  const countOf = (l: string) => counts.find((c) => c.level === l)?._count._all ?? 0;

  const missing = words.filter((w) => !w.audioAt).length;
  const usedVoices = [
    ...new Set(
      words
        .filter((w) => w.audioAt && w.audioSource === "TTS" && w.audioVoice)
        .map((w) => w.audioVoice!)
    ),
  ];
  const currentVoice = usedVoices[0] ?? DEFAULT_VOICE;

  return (
    <div className="qwide">
      <div className="qhead">
        <div>
          <h1>Spelling Bee words</h1>
          <p className="muted">
            Season {season.name} · The word bank for each category. Candidates will hear each
            word and type it.
          </p>
        </div>
      </div>

      {sp.msg && <div className="sp-msg">{sp.msg}</div>}

      <div className="sp-tabs">
        {levels.map((l) => (
          <Link
            key={l}
            href={`/dashboard/spelling?season=${season.id}&level=${l}`}
            className={`sp-tab${l === level ? " on" : ""}`}
          >
            {LEVEL_LABEL[l]} ({countOf(l)})
          </Link>
        ))}
      </div>

      <div className="sp-card">
        <WordForm
          seasonId={season.id}
          level={level}
          levelLabel={LEVEL_LABEL[level]}
          voices={VOICES}
          defaultVoice={currentVoice}
        />
      </div>

      <div className="sp-card">
        <h2>
          {LEVEL_LABEL[level]} · {words.length} {words.length === 1 ? "word" : "words"}
        </h2>
        {words.length === 0 && <p className="muted">No words in this category yet.</p>}
        {words.map((w) => (
          <div className="sp-row" key={w.id}>
            <div>
              <span className="sp-word">{w.word}</span>
              <span className={`sp-tag${w.audioAt ? " ok" : ""}`}>
                {!w.audioAt
                  ? "No audio yet"
                  : w.audioSource === "RECORDED"
                  ? "Recorded voice"
                  : "Computer voice"}
              </span>
              {w.sentence && <div className="sp-sent">Sentence: {w.sentence}</div>}
              {w.hint && <div className="sp-sent">Hint: {w.hint}</div>}
            </div>
            <div className="sp-right">
              {w.audioAt && (
                <audio
                  className="sp-audio"
                  controls
                  preload="none"
                  src={`/api/spelling-audio/${w.id}?v=${w.audioAt.getTime()}`}
                />
              )}
              <form action={deleteWordAction}>
                <input type="hidden" name="id" value={w.id} />
                <button type="submit" className="sp-del">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <details className="sp-more" open={missing > 0 || undefined}>
        <summary>More tools: add many words, make audio for the whole list</summary>
        <div className="sp-more-body">
          <div>
            <h2>Add many words at once</h2>
            <form action={addWordsAction}>
              <input type="hidden" name="seasonId" value={season.id} />
              <input type="hidden" name="level" value={level} />
              <textarea
                name="words"
                className="sp-area"
                placeholder={"necessary\nreceive | Please receive this gift.\nbeautiful"}
                required
              />
              <p className="sp-help">
                One word per line. To add a sentence the reader can use, put it after a | on the
                same line. Audio is made afterwards with the button on the right.
              </p>
              <button type="submit" className="btn">
                Add words
              </button>
            </form>
          </div>

          <div>
            <h2>Make computer-voice audio</h2>
            {usedVoices.length > 1 && (
              <div className="sp-warn">
                The computer-voice words in this category use different voices. Use “Regenerate
                all” so every candidate hears the same one. Recorded words are never changed.
              </div>
            )}
            <form action={generateAudioAction}>
              <input type="hidden" name="seasonId" value={season.id} />
              <input type="hidden" name="level" value={level} />
              <label htmlFor="voice" className="muted">
                Voice
              </label>
              <select id="voice" name="voice" defaultValue={currentVoice} className="sp-select">
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <div className="sp-btns">
                <button
                  type="submit"
                  name="mode"
                  value="missing"
                  className="btn"
                  disabled={missing === 0}
                >
                  Generate audio ({missing} missing)
                </button>
                <button
                  type="submit"
                  name="mode"
                  value="all"
                  className="btn"
                  disabled={words.length === 0}
                >
                  Regenerate all
                </button>
              </div>
              <p className="sp-help">Up to 12 words are done per click.</p>
            </form>
          </div>
        </div>
      </details>
    </div>
  );
}
