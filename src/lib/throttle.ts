import { db } from "@/lib/db";

/** Seconds left on a block for this key, or 0 if it is not blocked. */
export async function blockedFor(key: string): Promise<number> {
  const row = await db.playThrottle.findUnique({ where: { key } });
  if (!row?.blockedUntil) return 0;
  const ms = row.blockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/** Counts one failure. Reaching `max` inside the window blocks the key for `blockMs`. */
export async function recordFailure(
  key: string,
  max: number,
  windowMs: number,
  blockMs: number
): Promise<void> {
  const now = new Date();
  const row = await db.playThrottle.findUnique({ where: { key } });

  if (!row || now.getTime() - row.windowStart.getTime() > windowMs) {
    await db.playThrottle.upsert({
      where: { key },
      create: { key, failures: 1, windowStart: now, blockedUntil: null },
      update: { failures: 1, windowStart: now, blockedUntil: null },
    });
    return;
  }

  const failures = row.failures + 1;
  await db.playThrottle.update({
    where: { key },
    data: {
      failures,
      blockedUntil: failures >= max ? new Date(now.getTime() + blockMs) : null,
    },
  });
}

export async function clearKey(key: string): Promise<void> {
  await db.playThrottle.deleteMany({ where: { key } });
}
