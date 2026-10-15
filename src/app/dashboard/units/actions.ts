"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { OrgType, OrgUnit } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  PARENT_TYPE,
  TYPE_ORDER,
  makeCode,
  maxSuffix,
  parseCsv,
} from "@/lib/units";

type State = { error?: string; ok?: string };

export async function addUnitAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can do this." };
  }

  const type = String(formData.get("type") ?? "") as OrgType;
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;

  if (!(type in PARENT_TYPE)) return { error: "Choose a unit type." };
  if (!name) return { error: "Enter a name." };

  const needed = PARENT_TYPE[type];
  let parent: OrgUnit | null = null;
  if (needed) {
    if (!parentId) {
      return { error: `Choose the ${needed.toLowerCase()} this belongs to.` };
    }
    parent = await db.orgUnit.findUnique({ where: { id: parentId } });
    if (!parent || parent.type !== needed) {
      return { error: `The parent must be a ${needed.toLowerCase()}.` };
    }
  }

  const duplicate = await db.orgUnit.findFirst({
    where: {
      type,
      parentId: parent?.id ?? null,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (duplicate) return { error: `${name} already exists there.` };

  const codes = (
    await db.orgUnit.findMany({ where: { type }, select: { code: true } })
  ).map((c) => c.code);
  const code = makeCode(type, maxSuffix(codes) + 1);

  await db.orgUnit.create({
    data: { type, name, code, parentId: parent?.id ?? null },
  });

  revalidatePath("/dashboard/units");
  return { ok: `Added ${name} (${code}).` };
}

export async function importUnitsAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can do this." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file." };
  }
  if (file.size > 900_000) {
    return { error: "The file is too large. Keep it under 900 KB." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "The file has no data rows." };

  const expected = ["province", "zone", "area", "parish"];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (expected.some((h, i) => header[i] !== h)) {
    return { error: "The first row must be: province,zone,area,parish" };
  }

  const errors: string[] = [];
  const parsed: string[][] = [];
  rows.slice(1).forEach((r, i) => {
    const cells = expected.map((_, c) => (r[c] ?? "").trim());
    if (cells.some((c) => !c)) {
      errors.push(`Data row ${i + 1}: all four columns are required`);
    } else {
      parsed.push(cells);
    }
  });
  if (errors.length) {
    const more = errors.length > 5 ? ` (and ${errors.length - 5} more)` : "";
    return { error: errors.slice(0, 5).join("; ") + more };
  }

  const existing = await db.orgUnit.findMany({
    select: { id: true, type: true, name: true, code: true, parentId: true },
  });

  const counters = {} as Record<OrgType, number>;
  for (const t of TYPE_ORDER) {
    counters[t] = maxSuffix(
      existing.filter((u) => u.type === t).map((u) => u.code)
    );
  }

  const keyOf = (parentId: string | null, name: string) =>
    `${parentId ?? "root"}|${name.toLowerCase()}`;
  const byKey = new Map<string, string>();
  for (const u of existing) byKey.set(keyOf(u.parentId, u.name), u.id);

  type NewUnit = {
    id: string;
    type: OrgType;
    name: string;
    code: string;
    parentId: string | null;
  };
  const created: Record<OrgType, NewUnit[]> = {
    PROVINCE: [],
    ZONE: [],
    AREA: [],
    PARISH: [],
  };

  function ensure(type: OrgType, name: string, parentId: string | null) {
    const k = keyOf(parentId, name);
    const found = byKey.get(k);
    if (found) return found;
    const id = randomUUID();
    counters[type] += 1;
    created[type].push({
      id,
      type,
      name,
      code: makeCode(type, counters[type]),
      parentId,
    });
    byKey.set(k, id);
    return id;
  }

  for (const [p, z, a, pa] of parsed) {
    const pid = ensure("PROVINCE", p, null);
    const zid = ensure("ZONE", z, pid);
    const aid = ensure("AREA", a, zid);
    ensure("PARISH", pa, aid);
  }

  const total = TYPE_ORDER.reduce((n, t) => n + created[t].length, 0);
  if (total === 0) {
    return { ok: "Nothing new. Everything in the file already exists." };
  }

  try {
    await db.$transaction(
      TYPE_ORDER.filter((t) => created[t].length > 0).map((t) =>
        db.orgUnit.createMany({ data: created[t] })
      )
    );
  } catch {
    return { error: "The import failed and nothing was saved. Try again." };
  }

  revalidatePath("/dashboard/units");
  return {
    ok:
      `Created ${created.PROVINCE.length} provinces, ` +
      `${created.ZONE.length} zones, ${created.AREA.length} areas and ` +
      `${created.PARISH.length} parishes.`,
  };
}