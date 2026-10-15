"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/levels";
import { VOICES, synthesize } from "@/lib/tts";

const BATCH = 12;
const MAX_RECORDING_BYTES = 2_000_000;

async function requireEditor() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "QUESTION_UPLOADER") return null;
  return user;
}

/** First letter capital, the rest left as typed. */
function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanWord(s: string) {
  return capitalise(s.replace(/\s+/g, " ").trim());
}

/** Quick add: one word per line. Optional sentence after a | (pipe). */
export async function addWordsAction(fd: FormData): Promise<void> {
  if (!(await requireEditor())) return;

  const seasonId = String(fd.get("seasonId") ?? "");
  const level = String(fd.get("level") ?? "");
  const text = String(fd.get("words") ?? "");
  if (!seasonId || !level) return;

  const rows = text
    .split(/\r?\n/)
    .map((line) => {
      const [w, ...rest] = line.split("|");
      const sentence = rest.join("|").trim();
      return { word: cleanWord(w), sentence: sentence || null };
    })
    .filter((r) => r.word.length > 0 && r.word.length <= 60);

  if (rows.length === 0) return;

  await db.spellingWord.createMany({
    data: rows.map((r) => ({
      seasonId,
      level: level as never,
      word: r.word,
      sentence: r.sentence,
    })),
    skipDuplicates: true,
  });
  revalidatePath("/dashboard/spelling");
}

export async function deleteWordAction(fd: FormData): Promise<void> {
  if (!(await requireEditor())) return;
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  await db.spellingWord.deleteMany({ where: { id } });
  revalidatePath("/dashboard/spelling");
}

export type PreviewResult =
  | { ok: true; previews: { id: string; label: string; src: string }[] }
  | { ok: false; error: string };

/** Let the editor hear every voice say the word before saving. */
export async function previewVoicesAction(
  word: string,
  sentence: string
): Promise<PreviewResult> {
  if (!(await requireEditor())) return { ok: false, error: "Not allowed." };
  const w = cleanWord(word);
  if (!w || w.length > 60) return { ok: false, error: "Type the word first." };
  try {
    const previews = await Promise.all(
      VOICES.map(async (v) => {
        const a = await synthesize(w, sentence.trim() || null, v.id);
        return {
          id: v.id,
          label: v.label,
          src: `data:audio/mpeg;base64,${Buffer.from(a).toString("base64")}`,
        };
      })
    );
    return { ok: true, previews };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not make the preview." };
  }
}

export type SaveResult = { ok: boolean; message: string };

/** Save one word, either with a computer voice (mode "tts") or a recording (mode "rec"). */
export async function saveWordAction(fd: FormData): Promise<SaveResult> {
  if (!(await requireEditor())) return { ok: false, message: "Not allowed." };

  const seasonId = String(fd.get("seasonId") ?? "");
  const level = String(fd.get("level") ?? "");
  const mode = String(fd.get("mode") ?? "tts");
  const voice = String(fd.get("voice") ?? "");
  const hint = String(fd.get("hint") ?? "").trim();
  const sentence = String(fd.get("sentence") ?? "").trim();
  const word = cleanWord(String(fd.get("word") ?? ""));

  if (!seasonId || !(level in LEVEL_LABEL)) return { ok: false, message: "Choose a category." };
  if (!word) return { ok: false, message: "Type the word." };
  if (word.length > 60) return { ok: false, message: "The word is too long." };
  if (hint && hint.toLowerCase().includes(word.toLowerCase())) {
    return { ok: false, message: "The hint must not contain the word itself." };
  }

  let audio: Uint8Array<ArrayBuffer>;
  let audioMime = "audio/mpeg";
  let audioSource = "TTS";
  let audioVoice: string | null = null;

  if (mode === "rec") {
    const f = fd.get("audio");
    if (!(f instanceof File) || f.size === 0) {
      return { ok: false, message: "Record the word first." };
    }
    if (f.size > MAX_RECORDING_BYTES) {
      return { ok: false, message: "The recording is too large. Keep it under 30 seconds." };
    }
    audio = new Uint8Array(await f.arrayBuffer());
    audioMime = f.type || "audio/webm";
    audioSource = "RECORDED";
  } else {
    if (!VOICES.some((v) => v.id === voice)) return { ok: false, message: "Choose a voice." };
    try {
      audio = await synthesize(word, sentence || null, voice);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Could not make the audio." };
    }
    audioVoice = voice;
  }

  try {
    await db.spellingWord.create({
      data: {
        seasonId,
        level: level as never,
        word,
        sentence: sentence || null,
        hint: hint || null,
        audio: audio as Uint8Array<ArrayBuffer>,
        audioMime,
        audioSource,
        audioVoice,
        audioAt: new Date(),
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, message: `"${word}" is already in this category.` };
    }
    throw e;
  }

  revalidatePath("/dashboard/spelling");
  return { ok: true, message: `"${word}" saved.` };
}

/** Batch-generate computer-voice audio for words without any. Recorded words are never touched. */
export async function generateAudioAction(fd: FormData): Promise<void> {
  if (!(await requireEditor())) return;

  const seasonId = String(fd.get("seasonId") ?? "");
  const level = String(fd.get("level") ?? "");
  const voice = String(fd.get("voice") ?? "");
  const mode = String(fd.get("mode") ?? "missing");
  if (!seasonId || !(level in LEVEL_LABEL)) return;
  if (!VOICES.some((v) => v.id === voice)) return;

  const back = (msg: string) =>
    redirect(`/dashboard/spelling?season=${seasonId}&level=${level}&msg=${encodeURIComponent(msg)}`);

  const scope = { seasonId, level: level as never, audioSource: "TTS" };

  if (mode === "all") {
    await db.spellingWord.updateMany({ where: scope, data: { audioAt: null } });
  }

  const todo = await db.spellingWord.findMany({
    where: { ...scope, audioAt: null },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, word: true, sentence: true },
  });

  let done = 0;
  for (const w of todo) {
    try {
      const audio = await synthesize(w.word, w.sentence, voice);
      await db.spellingWord.update({
        where: { id: w.id },
        data: { audio, audioMime: "audio/mpeg", audioVoice: voice, audioAt: new Date() },
      });
      done++;
    } catch (e) {
      revalidatePath("/dashboard/spelling");
      back(
        `Stopped at "${w.word}" after ${done} done. ${
          e instanceof Error ? e.message : "Unknown error"
        }`
      );
    }
  }

  const left = await db.spellingWord.count({ where: { ...scope, audioAt: null } });
  revalidatePath("/dashboard/spelling");
  back(
    left > 0
      ? `Made audio for ${done} words. ${left} left. Click the button again to continue.`
      : `Audio is ready for every computer-voice word in this category.`
  );
}
