"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, type Competition, type Level, type OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { LEVELS } from "@/lib/levels";
import { EXAM_COMPETITIONS, canScheduleExams, parseLagos } from "@/lib/exams";

type State = { error?: string };

const STAGES: OrgType[] = ["PARISH", "AREA", "ZONE", "PROVINCE"];
const newPin = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

async function canManageUnit(
  user: { role: string; orgUnitId: string | null },
  unitId: string
) {
  if (!canScheduleExams(user.role)) return false;
  const units = await getVisibleUnits(user);
  return units.some((u) => u.id === unitId);
}

function readSchedule(fd: FormData) {
  const startsAt = parseLagos(String(fd.get("startsAt") ?? ""));
  if (!startsAt) return { error: "Choose the exam date and time." };

  const durationMinutes = Number(fd.get("durationMinutes"));
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180)
    return { error: "Duration must be between 5 and 180 minutes." };

  const raw = String(fd.get("questionCount") ?? "").trim();
  let questionCount: number | null = null;
  if (raw) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 200)
      return { error: "Number of questions must be 1 to 200, or leave it blank to use all." };
    questionCount = n;
  }
  return { data: { startsAt, durationMinutes, questionCount } };
}

async function checkBank(
  seasonId: string,
  competition: Competition,
  level: Level,
  questionCount: number | null
) {
  const available = await db.question.count({
    where: { seasonId, competition, level, active: true },
  });
  if (available === 0)
    return "There are no questions in the question bank for this quiz and category yet.";
  if (questionCount && questionCount > available)
    return `The question bank only has ${available} question${available === 1 ? "" : "s"} for this category.`;
  return null;
}

export async function createExamAction(
  _prev: State,
  fd: FormData
): Promise<State> {
  const user = await requireUser();
  if (!canScheduleExams(user.role))
    return { error: "You cannot schedule competitions." };

  const stage = String(fd.get("stage") ?? "");
  const unitId = String(fd.get("unitId") ?? "");
  const competition = String(fd.get("competition") ?? "");
  const level = String(fd.get("level") ?? "");

  if (!(STAGES as string[]).includes(stage)) return { error: "Choose a stage." };
  if (!unitId) return { error: "Choose a unit, or all units of the stage." };
  if (!(EXAM_COMPETITIONS as readonly string[]).includes(competition))
    return { error: "Choose a quiz." };
  if (!(LEVELS as readonly string[]).includes(level))
    return { error: "Choose a category." };

  const visible = await getVisibleUnits(user);
  const targets =
    unitId === "ALL"
      ? visible.filter((u) => u.type === stage)
      : visible.filter((u) => u.id === unitId && u.type === stage);
  if (targets.length === 0)
    return { error: "No units found for that stage that you manage." };

  const s = readSchedule(fd);
  if ("error" in s) return { error: s.error };
  if (s.data.startsAt.getTime() <= Date.now())
    return { error: "The start time must be in the future." };

  const season = await getCurrentSeason();
  if (!season) return { error: "There is no season yet." };

  const bankError = await checkBank(
    season.id,
    competition as Competition,
    level as Level,
    s.data.questionCount
  );
  if (bankError) return { error: bankError };

  const base = {
    seasonId: season.id,
    competition: competition as Competition,
    level: level as Level,
    ...s.data,
    createdById: user.id,
  };

  // one unit: create it and open it
  if (targets.length === 1) {
    let id: string;
    try {
      const exam = await db.exam.create({
        data: { ...base, orgUnitId: targets[0].id, pin: newPin() },
      });
      id = exam.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        return {
          error:
            "This unit already has that quiz scheduled for that category. Edit the existing one instead.",
        };
      throw e;
    }
    revalidatePath("/dashboard/exams");
    redirect(`/dashboard/exams/${id}`);
  }

  // all units of the stage: one exam each, each with its own PIN.
  // Units that already have this exam are skipped.
  const made = await db.exam.createMany({
    data: targets.map((u) => ({ ...base, orgUnitId: u.id, pin: newPin() })),
    skipDuplicates: true,
  });
  if (made.count === 0)
    return {
      error: "Every one of these units already has that quiz scheduled for that category.",
    };

  revalidatePath("/dashboard/exams");
  redirect("/dashboard/exams");
}

export async function updateExamAction(
  id: string,
  _prev: State,
  fd: FormData
): Promise<State> {
  const user = await requireUser();
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam || !(await canManageUnit(user, exam.orgUnitId)))
    return { error: "You cannot edit this competition." };

  const s = readSchedule(fd);
  if ("error" in s) return { error: s.error };

  const bankError = await checkBank(
    exam.seasonId,
    exam.competition,
    exam.level,
    s.data.questionCount
  );
  if (bankError) return { error: bankError };

  await db.exam.update({ where: { id }, data: s.data });
  revalidatePath("/dashboard/exams");
  redirect(`/dashboard/exams/${id}`);
}

export async function regeneratePinAction(id: string): Promise<void> {
  const user = await requireUser();
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam || !(await canManageUnit(user, exam.orgUnitId))) return;
  await db.exam.update({ where: { id }, data: { pin: newPin() } });
  revalidatePath(`/dashboard/exams/${id}`);
  revalidatePath("/dashboard/exams");
}

export async function deleteExamAction(id: string): Promise<void> {
  const user = await requireUser();
  const exam = await db.exam.findUnique({ where: { id } });
  if (!exam || !(await canManageUnit(user, exam.orgUnitId))) return;
  await db.exam.delete({ where: { id } });
  revalidatePath("/dashboard/exams");
  redirect("/dashboard/exams");
}
