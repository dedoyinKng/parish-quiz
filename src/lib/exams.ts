import type { OrgType } from "@prisma/client";

export const EXAM_COMPETITIONS = ["ZEAL_QUIZ", "BIBLE_QUIZ", "SPELLING_BEE"] as const;

export const STAGE_LABEL: Record<OrgType, string> = {
  PARISH: "Parish",
  AREA: "Area",
  ZONE: "Zone",
  PROVINCE: "Province",
};

// Nigeria has no daylight saving, so Lagos is always UTC+1.
const LAGOS_OFFSET = "+01:00";

// "2026-10-20T09:00" (typed in Lagos time) -> Date
export function parseLagos(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${LAGOS_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Date -> "2026-10-20T09:00" in Lagos time, for <input type="datetime-local">
export function toLagosInput(d: Date): string {
  return new Date(d.getTime() + 3600_000).toISOString().slice(0, 16);
}

export function formatLagos(d: Date): string {
  return d.toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ExamStatus = "upcoming" | "open" | "ended";

export function examStatus(
  startsAt: Date,
  durationMinutes: number,
  now: Date = new Date()
): ExamStatus {
  if (now < startsAt) return "upcoming";
  const end = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return now < end ? "open" : "ended";
}

export const STATUS_LABEL: Record<ExamStatus, string> = {
  upcoming: "Upcoming",
  open: "Open now",
  ended: "Ended",
};

export const STATUS_CLASS: Record<ExamStatus, string> = {
  upcoming: "pill-wait",
  open: "pill-ok",
  ended: "pill-end",
};

// The super admin and the coordinators schedule exams.
// Teachers can view them and read the PIN.
export function canScheduleExams(role: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "PROVINCE_COORDINATOR" ||
    role === "ZONE_COORDINATOR" ||
    role === "AREA_COORDINATOR"
  );
}

// Candidates may still enter this many minutes after the start time.
export const LATE_ENTRY_MINUTES = 15;

// Cookie that keeps a candidate signed in to their quiz on their device.
export const PLAY_COOKIE = "pq_play";
