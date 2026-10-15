"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, getVisibleUnits } from "@/lib/auth";
import {
  ROLE_RANK,
  ROLE_UNIT_TYPE,
  creatableRoles,
} from "@/lib/permissions";
import { tempPassword } from "@/lib/passwords";

type State = { error?: string; ok?: string; email?: string; password?: string };
type Actor = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Returns the target user only if the actor is allowed to manage them:
// lower rank than the actor, inside the actor's part of the hierarchy,
// and not the actor themselves.
async function loadManaged(actor: Actor, userId: string) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.id === actor.id) return null;
  if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) return null;
  if (actor.role !== "SUPER_ADMIN") {
    const visible = await getVisibleUnits(actor);
    if (!target.orgUnitId || !visible.some((u) => u.id === target.orgUnitId)) {
      return null;
    }
  }
  return target;
}

export async function createUserAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Please sign in again." };

  const allowed = creatableRoles(actor.role);
  if (allowed.length === 0) return { error: "You cannot create accounts." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as Role;
  const unitId = String(formData.get("unitId") ?? "");

  if (!name) return { error: "Enter a name." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (!allowed.includes(role)) {
    return { error: "Choose a role you are allowed to create." };
  }

  let orgUnitId: string | null = null;
  if (role !== "QUESTION_UPLOADER") {
    const visible = await getVisibleUnits(actor);
    const unit = visible.find((u) => u.id === unitId);
    if (!unit || unit.type !== ROLE_UNIT_TYPE[role]) {
      return { error: "Choose a unit that matches the role." };
    }
    orgUnitId = unit.id;
  }

  const exists = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (exists) return { error: "That email is already used by another account." };

  const password = tempPassword();
  await db.user.create({
    data: {
      name,
      email,
      phone,
      role,
      orgUnitId,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

    revalidatePath("/dashboard/users", "layout");
  return { ok: `Created ${name}.`, email, password };
}

export async function resetPasswordAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Please sign in again." };

  const target = await loadManaged(actor, String(formData.get("userId") ?? ""));
  if (!target) return { error: "You cannot manage this account." };

  const password = tempPassword();
  await db.user.update({
    where: { id: target.id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: "Password reset.", password };
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const actor = await getCurrentUser();
  if (!actor) return;

  const target = await loadManaged(actor, String(formData.get("userId") ?? ""));
  if (!target) return;

  await db.user.update({
    where: { id: target.id },
    data: { active: formData.get("active") === "true" },
  });
    revalidatePath("/dashboard/users", "layout");
}

export async function updateUserAction(
  userId: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Please sign in again." };

  const target = await loadManaged(actor, userId);
  if (!target) return { error: "You cannot manage this account." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) return { error: "Enter a name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };

  const clash = await db.user.findFirst({
    where: {
      id: { not: target.id },
      email: { equals: email, mode: "insensitive" },
    },
  });
  if (clash) return { error: "That email is used by another account." };

  await db.user.update({
    where: { id: target.id },
    data: { name, email, phone },
  });
    revalidatePath("/dashboard/users", "layout");
  return { ok: "Saved." };
}

export async function deleteUserAction(userId: string): Promise<State> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Please sign in again." };

  const target = await loadManaged(actor, userId);
  if (!target) return { error: "You cannot manage this account." };

  const made = await db.candidate.count({ where: { createdById: target.id } });
  if (made > 0) {
    return {
      error: `${target.name} has registered ${made} candidate(s). Deactivate the account instead.`,
    };
  }

  await db.user.delete({ where: { id: target.id } });
    revalidatePath("/dashboard/users", "layout");
  return { ok: "Deleted." };
}