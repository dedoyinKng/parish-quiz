"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, type Competition, type Level, type QuestionType } from "@prisma/client";
import { db as prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LEVELS } from "@/lib/levels";
import {
  QUESTION_COMPETITIONS,
  QUESTION_TYPES,
  canManageQuestions,
  parseContent,
} from "@/lib/questions";

type State = { error?: string; ok?: string; stamp?: number };

function setUrl(seasonId: string, competition: string, level: string) {
  return `/dashboard/questions/set?season=${seasonId}&competition=${competition}&level=${level}`;
}

async function readForm(formData: FormData) {
  const seasonId = String(formData.get("seasonId") ?? "");
  const competition = String(formData.get("competition") ?? "");
  const level = String(formData.get("level") ?? "");
  const type = String(formData.get("type") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();
  const marks = Number(formData.get("marks"));

  if (!(QUESTION_COMPETITIONS as readonly string[]).includes(competition))
    return { error: "Choose a competition." };
  if (!(LEVELS as readonly string[]).includes(level))
    return { error: "Choose a category." };
  if (!(QUESTION_TYPES as readonly string[]).includes(type))
    return { error: "Choose a question type." };
  if (!prompt) return { error: "Enter the question." };
  if (prompt.length > 1000) return { error: "The question is too long (1000 characters maximum)." };
  if (!Number.isInteger(marks) || marks < 1 || marks > 10)
    return { error: "Marks must be a whole number from 1 to 10." };

  let rawContent: unknown = {};
  try {
    rawContent = JSON.parse(String(formData.get("content") ?? "{}"));
  } catch {
    return { error: "Something went wrong reading the answer. Try again." };
  }
  const parsed = parseContent(type, rawContent, prompt);
  if (!parsed.ok) return { error: parsed.error };

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return { error: "That season no longer exists." };

  return {
    data: {
      seasonId,
      competition: competition as Competition,
      level: level as Level,
      type: type as QuestionType,
      prompt,
      marks,
      explanation: explanation || null,
      content: parsed.content as Prisma.InputJsonValue,
    },
  };
}

export async function createQuestionAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await requireUser();
  if (!canManageQuestions(user.role)) return { error: "You cannot add questions." };

  const r = await readForm(formData);
  if ("error" in r) return { error: r.error };

  await prisma.question.create({
    data: { ...r.data, createdById: user.id },
  });
  revalidatePath("/dashboard/questions");
  return { ok: "Question saved. Add the next one.", stamp: Date.now() };
}

export async function updateQuestionAction(
  id: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await requireUser();
  if (!canManageQuestions(user.role)) return { error: "You cannot edit questions." };

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return { error: "That question no longer exists." };

  const r = await readForm(formData);
  if ("error" in r) return { error: r.error };

  await prisma.question.update({ where: { id }, data: r.data });
  revalidatePath("/dashboard/questions");
  redirect(setUrl(r.data.seasonId, r.data.competition, r.data.level));
}

export async function deleteQuestionAction(id: string): Promise<void> {
  const user = await requireUser();
  if (!canManageQuestions(user.role)) return;

  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) redirect("/dashboard/questions");

  await prisma.question.delete({ where: { id } });
  revalidatePath("/dashboard/questions");
  redirect(
    q.seasonId
      ? setUrl(q.seasonId, q.competition, q.level)
      : "/dashboard/questions"
  );
}