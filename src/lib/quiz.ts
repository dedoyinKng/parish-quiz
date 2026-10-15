import type { QuestionContent } from "@/lib/questions";

// ---------- seeded shuffle (same order every time for the same candidate) ----------
function hasher(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rnd = mulberry32(hasher(seed));
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- what the candidate's browser is allowed to see (never the answers) ----------
export type PlayQuestion = {
  id: string;
  type: string;
  prompt: string;
  marks: number;
  options?: { i: number; text: string }[];
  gaps?: number;
  required?: number;
  lefts?: string[];
  rights?: { i: number; text: string }[];
  items?: { i: number; text: string }[];
};

export function toPlayQuestion(
  q: { id: string; type: string; prompt: string; marks: number; content: unknown },
  attemptId: string
): PlayQuestion {
  const c = (q.content ?? {}) as QuestionContent;
  const seed = `${attemptId}:${q.id}`;
  const base: PlayQuestion = {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    marks: q.marks,
  };

  // shuffled, and never left in the correct order
  const indexed = (list: string[]) => {
    let s = seededShuffle(
      list.map((text, i) => ({ i, text })),
      seed
    );
    if (s.length > 1 && s.every((x, k) => x.i === k)) s = [...s.slice(1), s[0]];
    return s;
  };

  switch (q.type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE":
      return {
        ...base,
        options: seededShuffle(
          (c.options ?? []).map((text, i) => ({ i, text })),
          seed
        ),
      };
    case "FILL_IN_GAP":
      return { ...base, gaps: (c.gaps ?? []).length };
    case "MULTIPLE_SHORT_ANSWER":
      return { ...base, required: c.required ?? 1 };
    case "MATCHING": {
      const pairs = c.pairs ?? [];
      return {
        ...base,
        lefts: pairs.map((p) => p.left),
        rights: indexed(pairs.map((p) => p.right)),
      };
    }
    case "SEQUENCE":
      return { ...base, items: indexed(c.items ?? []) };
    default:
      return base;
  }
}

// ---------- marking ----------
export const norm = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Returns the marks earned. No negative marks. Multi-part questions earn partial credit.
export function markQuestion(
  type: string,
  content: QuestionContent,
  answer: unknown,
  marks: number
): number {
  if (answer === undefined || answer === null) return 0;
  let frac = 0;

  switch (type) {
    case "SINGLE_CHOICE":
    case "TRUE_FALSE":
      frac = answer === content.correct ? 1 : 0;
      break;

    case "MULTIPLE_CHOICE": {
      const correct = Array.isArray(content.correct) ? content.correct : [];
      const picked = Array.isArray(answer)
        ? Array.from(new Set(answer.filter((n): n is number => typeof n === "number")))
        : [];
      const hits = picked.filter((p) => correct.includes(p)).length;
      const wrong = picked.length - hits;
      frac = correct.length ? Math.max(0, (hits - wrong) / correct.length) : 0;
      break;
    }

    case "FILL_IN_GAP": {
      const gaps = content.gaps ?? [];
      const a = Array.isArray(answer) ? answer : [];
      const ok = gaps.filter((g, i) => g.map(norm).includes(norm(a[i]))).length;
      frac = gaps.length ? ok / gaps.length : 0;
      break;
    }

    case "MULTIPLE_SHORT_ANSWER": {
      const pool = (content.answers ?? []).map(norm);
      const req = content.required ?? 1;
      const typed = Array.isArray(answer) ? answer.map(norm).filter(Boolean) : [];
      const matched = new Set<string>();
      for (const t of typed) if (pool.includes(t)) matched.add(t);
      frac = Math.min(matched.size, req) / req;
      break;
    }

    case "MATCHING": {
      const n = content.pairs?.length ?? 0;
      const a = Array.isArray(answer) ? answer : [];
      const ok = a.filter((v, i) => v === i).length;
      frac = n ? ok / n : 0;
      break;
    }

    case "SEQUENCE": {
      const n = content.items?.length ?? 0;
      const a = Array.isArray(answer) ? answer : [];
      const ok = a.filter((v, i) => v === i).length;
      frac = n ? ok / n : 0;
      break;
    }
  }

  return Math.round(frac * marks * 100) / 100;
}
