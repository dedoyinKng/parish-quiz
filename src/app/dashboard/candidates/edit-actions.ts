"use server";

import { revalidatePath } from "next/cache";
import type { Competition, Gender, Level } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  COMPETITIONS,
  LEVELS,
  LEVEL_LABEL,
  LEVEL_RANGE,
  ageOn,
} from "@/lib/levels";

type State = { error?: string; ok?: string };

// Only the parish teacher of the candidate's own parish may change it.
async function loadOwn(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PARISH_TEACHER" || !user.orgUnitId) return null;
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: { season: true },
  });
  if (!candidate || candidate.parishId !== user.orgUnitId) return null;
  return { user, candidate };
}

export async function updateCandidateAction(
  id: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  const own = await loadOwn(id);
  if (!own) return { error: "You cannot change this candidate." };
  const { candidate } = own;

  if (candidate.status === "WITHDRAWN") {
    return { error: "Restore this candidate before editing." };
  }
  const deadline = candidate.season.registrationDeadline;
  if (deadline && deadline < new Date()) {
    return { error: "Registration has closed, so changes are locked." };
  }

  const level = String(formData.get("level") ?? "") as Level;
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const dobRaw = String(formData.get("dateOfBirth") ?? "");
  const gender = String(formData.get("gender") ?? "") as Gender;
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim() || null;
  const comps = formData
    .getAll("competitions")
    .map(String)
    .filter((c): c is Competition => COMPETITIONS.includes(c as Competition));

  if (!LEVELS.includes(level)) return { error: "Select the category." };
  if (!fullName) return { error: "Enter the full name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) return { error: "Enter the date of birth." };
  if (gender !== "MALE" && gender !== "FEMALE") return { error: "Select the gender." };
  if (comps.length === 0) return { error: "Select at least one competition." };

  const dob = new Date(`${dobRaw}T00:00:00Z`);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) {
    return { error: "That date of birth is not valid." };
  }

  const age = ageOn(dob, candidate.season.ageReferenceDate);
  const [min, max] = LEVEL_RANGE[level];
  if (age < min || age > max) {
    return {
      error: `Age on ${candidate.season.ageReferenceDate.toISOString().slice(0, 10)} would be ${age}, which is outside ${LEVEL_LABEL[level]}.`,
    };
  }

  const dup = await db.candidate.findFirst({
    where: {
      id: { not: id },
      parishId: candidate.parishId,
      seasonId: candidate.seasonId,
      dateOfBirth: dob,
      fullName: { equals: fullName, mode: "insensitive" },
    },
  });
  if (dup) return { error: `${fullName} is already registered (${dup.code}).` };

  await db.$transaction([
    db.entry.deleteMany({ where: { candidateId: id } }),
    db.entry.createMany({
      data: comps.map((competition) => ({ candidateId: id, competition })),
    }),
    db.candidate.update({
      where: { id },
      data: { fullName, dateOfBirth: dob, gender, level, guardianPhone },
    }),
  ]);

  revalidatePath("/dashboard/candidates", "layout");
 return { ok: "Saved." };
}

export async function setWithdrawnAction(
  id: string,
  withdrawn: boolean
): Promise<State> {
  const own = await loadOwn(id);
  if (!own) return { error: "You cannot change this candidate." };

  await db.candidate.update({
    where: { id },
    data: { status: withdrawn ? "WITHDRAWN" : "REGISTERED" },
  });
  revalidatePath("/dashboard/candidates", "layout");
  return { ok: withdrawn ? "Withdrawn." : "Restored." };
}