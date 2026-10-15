import { db } from "@/lib/db";

// A season runs from 1 September to 31 August and is named by the two years
// it spans, for example "2026/2027". Lagos is always UTC+1.
export function seasonStartYear(now: Date = new Date()): number {
  const lagos = new Date(now.getTime() + 3600_000);
  const y = lagos.getUTCFullYear();
  return lagos.getUTCMonth() >= 8 ? y : y - 1; // September (8) onwards starts a new season
}

export function seasonNameFor(now: Date = new Date()): string {
  const y = seasonStartYear(now);
  return `${y}/${y + 1}`;
}

export function seasonDates(startYear: number) {
  return {
    start: new Date(Date.UTC(startYear, 8, 1)), // 1 September
    end: new Date(Date.UTC(startYear + 1, 7, 31)), // 31 August
  };
}

/** The season that today's date falls in. Falls back to the newest one if it has not been created yet. */
export async function getCurrentSeason() {
  const byName = await db.season.findUnique({ where: { name: seasonNameFor() } });
  if (byName) return byName;
  return db.season.findFirst({ orderBy: { createdAt: "desc" } });
}

/** Ages are counted on 1 August, just before the season starts in September. */
export function seasonAgeReference(startYear: number): Date {
  return new Date(Date.UTC(startYear, 7, 1));
}
