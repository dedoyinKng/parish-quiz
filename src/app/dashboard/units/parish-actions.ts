"use server";

import { revalidatePath } from "next/cache";
import type { OrgType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { makeCode, maxSuffix } from "@/lib/units";

type State = { error?: string; ok?: string };
type Tx = Prisma.TransactionClient;

async function make(
  tx: Tx,
  type: OrgType,
  name: string,
  parentId: string | null
) {
  const codes = (
    await tx.orgUnit.findMany({ where: { type }, select: { code: true } })
  ).map((c) => c.code);
  return tx.orgUnit.create({
    data: { type, name, parentId, code: makeCode(type, maxSuffix(codes) + 1) },
  });
}

function num(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return /^\d+$/.test(v) && Number(v) > 0 ? String(Number(v)) : null;
}

export async function addParishAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can do this." };
  }

  const kind = String(formData.get("kind") ?? "");
  const parishName = String(formData.get("parishName") ?? "").trim();
  if (!parishName) return { error: "Enter the parish name." };

  const provinceId = String(formData.get("provinceId") ?? "");
  const zoneId = String(formData.get("zoneId") ?? "");
  const areaId = String(formData.get("areaId") ?? "");

  try {
    // ---------- Province HQ ----------
    if (kind === "PROVINCE_HQ") {
      const n = num(formData, "provinceNumber");
      if (!n) return { error: "Enter the province number, e.g. 45." };
      const name = `Province ${n}`;
      if (await db.orgUnit.findFirst({ where: { type: "PROVINCE", name } })) {
        return { error: `${name} already exists.` };
      }
      await db.$transaction(async (tx) => {
        const prov = await make(tx, "PROVINCE", name, null);
        const parish = await make(tx, "PARISH", parishName, prov.id);
        await tx.orgUnit.update({
          where: { id: prov.id },
          data: { hqParishId: parish.id },
        });
      });
      revalidatePath("/dashboard/units");
      return { ok: `Added ${name} with headquarters ${parishName}.` };
    }

    // ---------- everything else needs a province ----------
    const province = await db.orgUnit.findUnique({ where: { id: provinceId } });
    if (!province || province.type !== "PROVINCE") {
      return { error: "Select the province." };
    }

    // ---------- Zone HQ (also the Area HQ) ----------
    if (kind === "ZONE_HQ") {
      const zn = num(formData, "zoneNumber");
      const an = num(formData, "areaNumber");
      if (!zn) return { error: "Enter the zone number, e.g. 3." };
      if (!an) return { error: "Enter the area number, e.g. 14." };
      const zoneName = `Zone ${zn}`;
      const areaName = `Area ${an}`;
      if (
        await db.orgUnit.findFirst({
          where: { type: "ZONE", name: zoneName, parentId: province.id },
        })
      ) {
        return { error: `${zoneName} already exists in ${province.name}.` };
      }
      if (
        await db.orgUnit.findFirst({
          where: { type: "AREA", name: areaName, parent: { parentId: province.id } },
        })
      ) {
        return { error: `${areaName} already exists in ${province.name}.` };
      }
      await db.$transaction(async (tx) => {
        const zone = await make(tx, "ZONE", zoneName, province.id);
        const area = await make(tx, "AREA", areaName, zone.id);
        const parish = await make(tx, "PARISH", parishName, area.id);
        await tx.orgUnit.update({
          where: { id: zone.id },
          data: { hqParishId: parish.id },
        });
        await tx.orgUnit.update({
          where: { id: area.id },
          data: { hqParishId: parish.id },
        });
      });
      revalidatePath("/dashboard/units");
      return {
        ok: `Added ${parishName} as headquarters of ${zoneName} and ${areaName}.`,
      };
    }

    // ---------- Area HQ / Parish need a zone under that province ----------
    const zone = await db.orgUnit.findUnique({ where: { id: zoneId } });
    if (!zone || zone.type !== "ZONE" || zone.parentId !== province.id) {
      return { error: "Select the zone." };
    }

    if (kind === "AREA_HQ") {
      const an = num(formData, "areaNumber");
      if (!an) return { error: "Enter the area number, e.g. 12." };
      const areaName = `Area ${an}`;
      if (
        await db.orgUnit.findFirst({
          where: { type: "AREA", name: areaName, parent: { parentId: province.id } },
        })
      ) {
        return { error: `${areaName} already exists in ${province.name}.` };
      }
      await db.$transaction(async (tx) => {
        const area = await make(tx, "AREA", areaName, zone.id);
        const parish = await make(tx, "PARISH", parishName, area.id);
        await tx.orgUnit.update({
          where: { id: area.id },
          data: { hqParishId: parish.id },
        });
      });
      revalidatePath("/dashboard/units");
      return { ok: `Added ${parishName} as headquarters of ${areaName}.` };
    }

    // ---------- Parish only ----------
    if (kind === "PARISH") {
      const area = await db.orgUnit.findUnique({ where: { id: areaId } });
      if (!area || area.type !== "AREA" || area.parentId !== zone.id) {
        return { error: "Select the area." };
      }
      if (
        await db.orgUnit.findFirst({
          where: {
            type: "PARISH",
            parentId: area.id,
            name: { equals: parishName, mode: "insensitive" },
          },
        })
      ) {
        return { error: `${parishName} already exists in ${area.name}.` };
      }
      await db.$transaction(async (tx) => {
        await make(tx, "PARISH", parishName, area.id);
      });
      revalidatePath("/dashboard/units");
      return { ok: `Added ${parishName} to ${area.name}.` };
    }

    return { error: "Choose what kind of parish this is." };
  } catch {
    return { error: "Could not save. Nothing was added. Try again." };
  }
}