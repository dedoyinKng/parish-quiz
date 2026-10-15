"use server";

import { revalidatePath } from "next/cache";
import type { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { makeCode, maxSuffix } from "@/lib/units";

type State = { error?: string; ok?: string };

export async function addStructureAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can do this." };
  }

  const type = String(formData.get("type") ?? "") as OrgType;
  const raw = String(formData.get("number") ?? "").trim();
  const provinceId = String(formData.get("provinceId") ?? "");
  const zoneId = String(formData.get("zoneId") ?? "");

  if (!["PROVINCE", "ZONE", "AREA"].includes(type)) {
    return { error: "Choose province, zone or area." };
  }
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    return { error: "Enter a number, e.g. 45." };
  }
  const n = String(Number(raw));
  const label = type === "PROVINCE" ? "Province" : type === "ZONE" ? "Zone" : "Area";
  const name = `${label} ${n}`;

  let parentId: string | null = null;

  if (type === "PROVINCE") {
    if (await db.orgUnit.findFirst({ where: { type, name } })) {
      return { error: `${name} already exists.` };
    }
  }

  if (type === "ZONE" || type === "AREA") {
    const province = await db.orgUnit.findUnique({ where: { id: provinceId } });
    if (!province || province.type !== "PROVINCE") {
      return { error: "Select the province." };
    }

    if (type === "ZONE") {
      parentId = province.id;
      if (await db.orgUnit.findFirst({ where: { type, name, parentId } })) {
        return { error: `${name} already exists in ${province.name}.` };
      }
    } else {
      const zone = await db.orgUnit.findUnique({ where: { id: zoneId } });
      if (!zone || zone.type !== "ZONE" || zone.parentId !== province.id) {
        return { error: "Select the zone." };
      }
      parentId = zone.id;
      if (
        await db.orgUnit.findFirst({
          where: { type, name, parent: { parentId: province.id } },
        })
      ) {
        return { error: `${name} already exists in ${province.name}.` };
      }
    }
  }

  const codes = (
    await db.orgUnit.findMany({ where: { type }, select: { code: true } })
  ).map((c) => c.code);
  const code = makeCode(type, maxSuffix(codes) + 1);

  await db.orgUnit.create({ data: { type, name, code, parentId } });

  revalidatePath("/dashboard/units");
  return { ok: `Added ${name}.` };
}