"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { seasonAgeReference, seasonStartYear } from "@/lib/season";

export async function createSeasonAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") return;

  const startYear = Number(fd.get("startYear"));
  const now = seasonStartYear();
  // only the current season or the next one can be created
  if (!Number.isInteger(startYear) || startYear < now || startYear > now + 1) return;

  try {
    await db.season.create({
      data: {
        name: `${startYear}/${startYear + 1}`,
        ageReferenceDate: seasonAgeReference(startYear),
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e; // already exists
  }
  revalidatePath("/dashboard/seasons");
}
