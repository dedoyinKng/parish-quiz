import type { Role } from "@prisma/client";

export const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_IN_GAP",
  "MULTIPLE_SHORT_ANSWER",
  "MATCHING",
  "SEQUENCE",
] as const;

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  FILL_IN_GAP: "Fill in the Gap",
  MULTIPLE_SHORT_ANSWER: "Multiple Short Answer",
  MATCHING: "Matching",
  SEQUENCE: "Sequence",
};

// Spelling Bee has its own word list step, so it is not here.
export const QUESTION_COMPETITIONS = ["ZEAL_QUIZ", "BIBLE_QUIZ"] as const;

export const GAP = "___";

export function countGaps(prompt: string): number {
  return prompt.split(GAP).length - 1;
}

export function canManageQuestions(role: Role | string): boolean {
  return role === "SUPER_ADMIN" || role === "QUESTION_UPLOADER";
}

export type QuestionContent = {
  options?: string[];
  correct?: number | number[] | boolean;
  answers?: string[];
  required?: number;
  gaps?: string[][];
  pairs?: { left: string; right: string }[];
  items?: string[];
};

export type ParseResult =
  | { ok: true; content: QuestionContent }
  | { ok: false; error: string };

const str = (v: unknown) => String(v ?? "").trim();
const lower = (s: string) => s.toLowerCase();
const allUnique = (list: string[]) =>
  new Set(list.map(lower)).size === list.length;

export function parseContent(
  type: string,
  raw: unknown,
  prompt: string
): ParseResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const err = (error: string): ParseResult => ({ ok: false, error });
  const ok = (content: QuestionContent): ParseResult => ({ ok: true, content });

  switch (type) {
    case "SINGLE_CHOICE":
    case "MULTIPLE_CHOICE": {
      const options = Array.isArray(r.options) ? r.options.map(str) : [];
      if (options.length < 2 || options.length > 8)
        return err("Add between 2 and 8 options.");
      if (options.some((o) => !o))
        return err("Fill in every option or remove the empty ones.");
      if (!allUnique(options))
        return err("Options must be different from each other.");

      if (type === "SINGLE_CHOICE") {
        const c = r.correct;
        if (typeof c !== "number" || !Number.isInteger(c) || c < 0 || c >= options.length)
          return err("Select the correct option.");
        return ok({ options, correct: c });
      }
      const picked = Array.isArray(r.correct)
        ? r.correct.filter(
            (x): x is number =>
              typeof x === "number" && Number.isInteger(x) && x >= 0 && x < options.length
          )
        : [];
      const correct = Array.from(new Set(picked)).sort((a, b) => a - b);
      if (correct.length < 1) return err("Tick at least one correct option.");
      return ok({ options, correct });
    }

    case "TRUE_FALSE": {
      if (typeof r.correct !== "boolean") return err("Choose True or False.");
      return ok({ correct: r.correct });
    }

    case "FILL_IN_GAP": {
      const n = countGaps(prompt);
      if (n < 1) return err("Type ___ in the question where each gap goes.");
      const gaps = Array.isArray(r.gaps)
        ? r.gaps.map((g) => (Array.isArray(g) ? g.map(str).filter(Boolean) : []))
        : [];
      if (gaps.length !== n)
        return err("The number of gap answers must match the number of ___ in the question.");
      if (gaps.some((g) => g.length === 0))
        return err("Give at least one accepted answer for every gap.");
      return ok({ gaps });
    }

    case "MULTIPLE_SHORT_ANSWER": {
      const required = Number(r.required);
      if (!Number.isInteger(required) || required < 1 || required > 10)
        return err("Number of answers required must be between 1 and 10.");
      const answers = Array.isArray(r.answers) ? r.answers.map(str).filter(Boolean) : [];
      if (!allUnique(answers)) return err("Acceptable answers must not repeat.");
      if (answers.length < required)
        return err("Add at least as many acceptable answers as the number required.");
      return ok({ required, answers });
    }

    case "MATCHING": {
      const pairs = Array.isArray(r.pairs)
        ? r.pairs.map((p) => {
            const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
            return { left: str(o.left), right: str(o.right) };
          })
        : [];
      if (pairs.length < 2 || pairs.length > 8) return err("Add between 2 and 8 pairs.");
      if (pairs.some((p) => !p.left || !p.right))
        return err("Fill in both sides of every pair.");
      if (!allUnique(pairs.map((p) => p.left)) || !allUnique(pairs.map((p) => p.right)))
        return err("Each item and each match must be different.");
      return ok({ pairs });
    }

    case "SEQUENCE": {
      const items = Array.isArray(r.items) ? r.items.map(str) : [];
      if (items.length < 2 || items.length > 8) return err("Add between 2 and 8 items.");
      if (items.some((i) => !i)) return err("Fill in every item or remove the empty ones.");
      if (!allUnique(items)) return err("Items must be different from each other.");
      return ok({ items });
    }

    default:
      return err("Choose a question type.");
  }
}