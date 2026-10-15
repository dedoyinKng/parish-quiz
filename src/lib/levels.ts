import type { Competition, Level } from "@prisma/client";

export const LEVEL_LABEL: Record<Level, string> = {
  L6_8: "6-8 years",
  L9_12: "9-12 years",
  L13_15: "13-15 years",
  L16_19: "16-19 years",
};

export const COMPETITION_LABEL: Record<Competition, string> = {
  ZEAL_QUIZ: "Zeal Quiz",
  BIBLE_QUIZ: "Bible Quiz",
  SPELLING_BEE: "Spelling Bee",
};

export const COMPETITIONS = Object.keys(COMPETITION_LABEL) as Competition[];

export const LEVELS = Object.keys(LEVEL_LABEL) as Level[];

export const LEVEL_RANGE: Record<Level, [number, number]> = {
  L6_8: [6, 8],
  L9_12: [9, 12],
  L13_15: [13, 15],
  L16_19: [16, 19],
};

export function ageOn(dob: Date, ref: Date): number {
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    ref.getUTCMonth() < dob.getUTCMonth() ||
    (ref.getUTCMonth() === dob.getUTCMonth() &&
      ref.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function levelForAge(age: number): Level | null {
  if (age >= 6 && age <= 8) return "L6_8";
  if (age >= 9 && age <= 12) return "L9_12";
  if (age >= 13 && age <= 15) return "L13_15";
  if (age >= 16 && age <= 19) return "L16_19";
  return null;
}