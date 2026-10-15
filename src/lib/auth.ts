import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";

export async function getCurrentUser() {
  const uid = await readSession();
  if (!uid) return null;
  const user = await db.user.findUnique({
    where: { id: uid },
    include: { orgUnit: true },
  });
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Returns the user's own unit plus everything beneath it.
// Super admins get every unit.
export async function getVisibleUnits(user: {
  role: string;
  orgUnitId: string | null;
}) {
  const all = await db.orgUnit.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  if (user.role === "SUPER_ADMIN") return all;
  if (!user.orgUnitId) return [];

  const childrenOf = new Map<string, typeof all>();
  for (const u of all) {
    if (u.parentId) {
      const list = childrenOf.get(u.parentId) ?? [];
      list.push(u);
      childrenOf.set(u.parentId, list);
    }
  }

  const result: typeof all = [];
  const start = all.find((u) => u.id === user.orgUnitId);
  const stack = start ? [start] : [];
  while (stack.length) {
    const next = stack.pop()!;
    result.push(next);
    stack.push(...(childrenOf.get(next.id) ?? []));
  }
  return result;
}