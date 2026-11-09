"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { destroySession } from "@/lib/session";

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

export async function deleteAccountAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const password = String(formData.get("password") ?? "");
  const sure = formData.get("sure") === "on";
  if (!sure) return { error: "Tick the box to confirm." };
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Your password is wrong." };
  }

  if (user.role === "SUPER_ADMIN") {
    const others = await db.user.count({
      where: { role: "SUPER_ADMIN", active: true, id: { not: user.id } },
    });
    if (others === 0) {
      return {
        error:
          "You are the only super admin. Make another super admin before deleting this account.",
      };
    }
  }

  try {
    await db.user.delete({ where: { id: user.id } });
  } catch {
    // Linked to candidates, questions or exams they created: keep those
    // records, but remove the person's ability to sign in and free the email.
    await db.user.update({
      where: { id: user.id },
      data: {
        active: false,
        name: "Deleted user",
        email: `deleted-${user.id}@deleted.invalid`,
        phone: null,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
      },
    });
  }

  await destroySession();
  redirect("/login");
}
