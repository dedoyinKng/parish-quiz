"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type State = { error?: string; ok?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "SUPER_ADMIN" ? user : null;
}

export async function renameUnitAction(
  id: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Only the super admin can do this." };

  const unit = await db.orgUnit.findUnique({ where: { id } });
  if (!unit) return { error: "That unit no longer exists." };

  let name: string;
  if (unit.type === "PARISH") {
    name = String(formData.get("value") ?? "").trim();
    if (!name) return { error: "Enter the parish name." };
  } else {
    const raw = String(formData.get("value") ?? "").trim();
    if (!/^\d+$/.test(raw) || Number(raw) < 1) {
      return { error: "Enter a number, e.g. 45." };
    }
    const label =
      unit.type === "PROVINCE" ? "Province" : unit.type === "ZONE" ? "Zone" : "Area";
    name = `${label} ${Number(raw)}`;
  }

  if (name === unit.name) return { ok: "No change." };

  let clash;
  if (unit.type === "AREA") {
    const zone = unit.parentId
      ? await db.orgUnit.findUnique({ where: { id: unit.parentId } })
      : null;
    clash = await db.orgUnit.findFirst({
      where: {
        id: { not: id },
        type: "AREA",
        name: { equals: name, mode: "insensitive" },
        parent: { parentId: zone?.parentId ?? null },
      },
    });
  } else {
    clash = await db.orgUnit.findFirst({
      where: {
        id: { not: id },
        type: unit.type,
        parentId: unit.parentId,
        name: { equals: name, mode: "insensitive" },
      },
    });
  }
  if (clash) return { error: `${name} already exists there.` };

  await db.orgUnit.update({ where: { id }, data: { name } });
  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard");
  return { ok: `Renamed to ${name}.` };
}

export async function deleteUnitAction(id: string): Promise<State> {
  if (!(await requireAdmin())) return { error: "Only the super admin can do this." };

  const unit = await db.orgUnit.findUnique({ where: { id } });
  if (!unit) return { error: "That unit no longer exists." };

  const [children, users, candidates] = await Promise.all([
    db.orgUnit.count({ where: { parentId: id } }),
    db.user.count({ where: { orgUnitId: id } }),
    db.candidate.count({ where: { parishId: id } }),
  ]);

  if (children > 0) {
    return { error: `${unit.name} still has ${children} unit(s) under it. Delete those first.` };
  }
  if (users > 0) {
    return { error: `${unit.name} still has ${users} staff account(s). Remove them first.` };
  }
  if (candidates > 0) {
    return { error: `${unit.name} has ${candidates} registered candidate(s) and cannot be deleted.` };
  }

  await db.orgUnit.delete({ where: { id } });
  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard");
  return { ok: `Deleted ${unit.name}.` };
}

export async function setHqAction(
  unitId: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Only the super admin can do this." };

  const unit = await db.orgUnit.findUnique({ where: { id: unitId } });
  if (!unit || unit.type === "PARISH") return { error: "That unit cannot have an HQ." };

  const parishId = String(formData.get("parishId") ?? "");
  if (!parishId) {
    await db.orgUnit.update({ where: { id: unitId }, data: { hqParishId: null } });
    revalidatePath("/dashboard/units");
    return { ok: "HQ cleared." };
  }

  const parish = await db.orgUnit.findUnique({ where: { id: parishId } });
  if (!parish || parish.type !== "PARISH") return { error: "Choose a parish." };

  // The parish must sit somewhere beneath this unit.
  let cursor: string | null = parish.parentId;
  let inside = false;
  for (let i = 0; i < 6 && cursor; i++) {
    if (cursor === unit.id) {
      inside = true;
      break;
    }
    const up: { parentId: string | null } | null = await db.orgUnit.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = up?.parentId ?? null;
  }
  if (!inside) return { error: `${parish.name} is not inside ${unit.name}.` };

  await db.orgUnit.update({ where: { id: unitId }, data: { hqParishId: parish.id } });
  revalidatePath("/dashboard/units");
  revalidatePath("/register");
  return { ok: `${parish.name} is now the HQ of ${unit.name}.` };
}