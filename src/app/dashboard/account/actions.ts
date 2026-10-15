"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type State = { error?: string; ok?: string };

export async function changePasswordAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Your current password is wrong." };
  }
  if (next.length < 8) {
    return { error: "The new password must be at least 8 characters." };
  }
  if (next !== confirm) return { error: "The new passwords do not match." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: "Password changed." };
}