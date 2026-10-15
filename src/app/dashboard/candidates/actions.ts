"use server";

import { revalidatePath } from "next/cache";
import type { Competition, Gender, Level } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season";
import { getCurrentUser } from "@/lib/auth";
import {
  COMPETITIONS,
  LEVELS,LEVEL_LABEL,
  LEVEL_RANGE,
  ageOn,
} from "@/lib/levels";
import { candidateCodeFor } from "@/lib/candidate-code";

type State = { error?: string; ok?: string; code?: string };

export async function registerCandidateAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user || user.role !== "PARISH_TEACHER" || !user.orgUnitId) {
    return { error: "Only a parish teacher can register candidates." };
  }
  const parish = await db.orgUnit.findUnique({ where: { id: user.orgUnitId } });
  if (!parish) return { error: "Your parish could not be found." };

  const season = await getCurrentSeason();
  if (!season) return { error: "No season is set up yet." };
  if (season.registrationDeadline && season.registrationDeadline < new Date()) {
    return { error: "Registration for this season has closed." };
  }

  const level = String(formData.get("level") ?? "") as Level;
  const fullName = String(formData.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const dobRaw = String(formData.get("dateOfBirth") ?? "");
  const gender = String(formData.get("gender") ?? "") as Gender;
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim() || null;
  const consent = formData.get("guardianConsent") === "on";
  const comps = formData
    .getAll("competitions")
    .map(String)
    .filter((c): c is Competition => COMPETITIONS.includes(c as Competition));

  if (!LEVELS.includes(level)) return { error: "Select the category first." };
  if (!fullName) return { error: "Enter the candidate's full name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) return { error: "Enter the date of birth." };
  if (gender !== "MALE" && gender !== "FEMALE") return { error: "Select the gender." };
  if (comps.length === 0) return { error: "Select at least one competition." };
  if (!consent) return { error: "A parent or guardian must consent." };

  const dob = new Date(`${dobRaw}T00:00:00Z`);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) {
    return { error: "That date of birth is not valid." };
  }

  const age = ageOn(dob, season.ageReferenceDate);
  const [min, max] = LEVEL_RANGE[level];
  if (age < min || age > max) {
    return {
      error: `Age on ${season.ageReferenceDate.toISOString().slice(0, 10)} would be ${age}, which is outside ${LEVEL_LABEL[level]}. Choose the right category or check the date of birth.`,
    };
  }

  const dup = await db.candidate.findFirst({
    where: {
      parishId: parish.id,
      seasonId: season.id,
      dateOfBirth: dob,
      fullName: { equals: fullName, mode: "insensitive" },
    },
  });
  if (dup) return { error: `${fullName} is already registered (${dup.code}).` };

  for (let attempt = 0; attempt < 15; attempt++) {
    const code = candidateCodeFor(parish.name);
    try {
      await db.candidate.create({
        data: {
          code,
          fullName,
          dateOfBirth: dob,
          gender,
          level,
          guardianConsent: true,
          guardianPhone,
          parishId: parish.id,
          seasonId: season.id,
          createdById: user.id,
          entries: { create: comps.map((competition) => ({ competition })) },
        },
      });
      revalidatePath("/dashboard/candidates");
      return { ok: `Registered ${fullName}.`, code };
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") {
        return { error: "Could not save. Nothing was registered. Try again." };
      }
      // code already taken: loop and generate another
    }
  }
  return { error: "Could not generate a unique ID. Try again." };
}