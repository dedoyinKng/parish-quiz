"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { getUnitResult } from "@/lib/qualify";

async function allowed(unitId: string) {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") return null;
  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === unitId)) return null;
  return user;
}

export async function decideTieAction(fd: FormData): Promise<void> {
  const seasonId = String(fd.get("seasonId") ?? "");
  const orgUnitId = String(fd.get("orgUnitId") ?? "");
  const level = String(fd.get("level") ?? "");
  const candidateId = String(fd.get("candidateId") ?? "");
  if (!seasonId || !orgUnitId || !level || !candidateId) return;

  const user = await allowed(orgUnitId);
  if (!user) return;

  // only a candidate who is genuinely tied for first can be chosen
  const res = await getUnitResult(seasonId, orgUnitId, level);
  if (!res.tied.some((t) => t.candidateId === candidateId)) return;

  await db.qualifierOverride.upsert({
    where: {
      seasonId_orgUnitId_level: { seasonId, orgUnitId, level: level as never },
    },
    update: { candidateId, decidedById: user.id },
    create: {
      seasonId,
      orgUnitId,
      level: level as never,
      candidateId,
      decidedById: user.id,
    },
  });
  revalidatePath("/dashboard/qualified");
}

export async function undoTieAction(fd: FormData): Promise<void> {
  const seasonId = String(fd.get("seasonId") ?? "");
  const orgUnitId = String(fd.get("orgUnitId") ?? "");
  const level = String(fd.get("level") ?? "");
  if (!seasonId || !orgUnitId || !level) return;

  const user = await allowed(orgUnitId);
  if (!user) return;

  await db.qualifierOverride.deleteMany({
    where: { seasonId, orgUnitId, level: level as never },
  });
  revalidatePath("/dashboard/qualified");
}
