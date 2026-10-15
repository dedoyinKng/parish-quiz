"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { makeCode, maxSuffix } from "@/lib/units";

type State = { error?: string };

class UserError extends Error {}

export async function registerParishAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const name = g("name");
  const email = g("email").toLowerCase();
  const phone = g("phone");
  const password = String(formData.get("password") ?? "");
  const provinceId = g("provinceId");
  const zoneId = g("zoneId");
  const areaId = g("areaId");
  const parishId = g("parishId");
  const parishName = g("parishName");

  if (!provinceId) return { error: "Select your province." };
  if (!zoneId) return { error: "Select your zone." };
  if (zoneId !== "ANNEX" && !areaId) return { error: "Select your area." };
  if (!parishId) return { error: "Select your parish." };
  if (parishId === "NEW" && !parishName) {
    return { error: "Enter your parish name." };
  }
  if (!name) return { error: "Enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const province = await db.orgUnit.findUnique({ where: { id: provinceId } });
  if (!province || province.type !== "PROVINCE") {
    return { error: "Select your province." };
  }

  let parentId: string;
  if (zoneId === "ANNEX") {
    parentId = province.id;
  } else {
    const zone = await db.orgUnit.findUnique({ where: { id: zoneId } });
    if (!zone || zone.type !== "ZONE" || zone.parentId !== province.id) {
      return { error: "Select your zone." };
    }
    const area = await db.orgUnit.findUnique({ where: { id: areaId } });
    if (!area || area.type !== "AREA" || area.parentId !== zone.id) {
      return { error: "Select your area." };
    }
    parentId = area.id;
  }

  const taken = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (taken) return { error: "That email already has an account. Sign in instead." };

  const passwordHash = await bcrypt.hash(password, 10);

  let userId: string;
  try {
    userId = await db.$transaction(async (tx) => {
      let parish: { id: string };

      if (parishId !== "NEW") {
        const found = await tx.orgUnit.findUnique({ where: { id: parishId } });
        if (!found || found.type !== "PARISH" || found.parentId !== parentId) {
          throw new UserError("Select your parish.");
        }
        const teachers = await tx.user.count({
          where: { orgUnitId: found.id, role: "PARISH_TEACHER" },
        });
        if (teachers > 0) {
          throw new UserError(
            "This parish already has a teacher account. Ask your area coordinator to add you."
          );
        }
        parish = found;
      } else {
        const dup = await tx.orgUnit.findFirst({
          where: {
            type: "PARISH",
            parentId,
            name: { equals: parishName, mode: "insensitive" },
          },
        });
        if (dup) {
          throw new UserError(
            "A parish with that name already exists there. Pick it from the list."
          );
        }
        const codes = (
          await tx.orgUnit.findMany({
            where: { type: "PARISH" },
            select: { code: true },
          })
        ).map((c) => c.code);
        parish = await tx.orgUnit.create({
          data: {
            type: "PARISH",
            name: parishName,
            parentId,
            code: makeCode("PARISH", maxSuffix(codes) + 1),
          },
        });
      }

      const user = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash,
          role: "PARISH_TEACHER",
          orgUnitId: parish.id,
        },
      });
      return user.id;
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    return { error: "Could not register. Nothing was saved. Try again." };
  }

  await createSession(userId);
  redirect("/dashboard");
}