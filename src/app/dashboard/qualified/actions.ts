"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, getVisibleUnits } from "@/lib/auth";
import { getUnitResult, type Track } from "@/lib/qualify";

async function allowed(unitId: string) {
  const user = await requireUser();
  if (user.role === "QUESTION_UPLOADER") return null;
  const units = await getVisibleUnits(user);
  if (!units.some((u) => u.id === unitId)) return null;
  return user;
}

const trackOf = (fd: FormData): Track =>
  String(fd.get("track") ?? "") === "SPELLING_BEE" ? "SPELLING_BEE" : "QUIZ";

export async function decideTieAction(fd: FormData): Promise<void> {
  const seasonId = String(fd.get("seasonId") ?? "");
  const orgUnitId = String(fd.get("orgUnitId") ?? "");
  const level = String(fd.get("level") ?? "");
  const candidateId = String(fd.get("candidateId") ?? "");
  const track = trackOf(fd);
  if (!seasonId || !orgUnitId || !level || !candidateId) return;

  const user = await allowed(orgUnitId);
  if (!user) return;

  const res = await getUnitResult(seasonId, orgUnitId, level, track);
  if (!res.tied.some((t) => t.candidateId === candidateId)) return;

  await db.qualifierOverride.upsert({
    where: {
      seasonId_orgUnitId_level_track: {
        seasonId,
        orgUnitId,
        level: level as never,
        track,
      },
    },
    update: { candidateId, decidedById: user.id },
    create: {
      seasonId,
      orgUnitId,
      level: level as never,
      track,
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
  const track = trackOf(fd);
  if (!seasonId || !orgUnitId || !level) return;

  const user = await allowed(orgUnitId);
  if (!user) return;

  await db.qualifierOverride.deleteMany({
    where: { seasonId, orgUnitId, level: level as never, track },
  });
  revalidatePath("/dashboard/qualified");
}
