import type { OrgType, Role } from "@prisma/client";

export const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 5,
  PROVINCE_COORDINATOR: 4,
  ZONE_COORDINATOR: 3,
  AREA_COORDINATOR: 2,
  PARISH_TEACHER: 1,
  QUESTION_UPLOADER: 0,
};

export const ROLE_UNIT_TYPE: Record<Role, OrgType | null> = {
  SUPER_ADMIN: null,
  PROVINCE_COORDINATOR: "PROVINCE",
  ZONE_COORDINATOR: "ZONE",
  AREA_COORDINATOR: "AREA",
  PARISH_TEACHER: "PARISH",
  QUESTION_UPLOADER: null,
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  PROVINCE_COORDINATOR: "Province coordinator",
  ZONE_COORDINATOR: "Zone coordinator",
  AREA_COORDINATOR: "Area coordinator",
  PARISH_TEACHER: "Parish teacher",
  QUESTION_UPLOADER: "Question uploader",
};

// Roles this role may create: anything strictly below it (never a super admin).
// Only the super admin may create question uploaders.
export function creatableRoles(role: Role): Role[] {
  return (Object.keys(ROLE_RANK) as Role[]).filter(
    (r) =>
      r !== "SUPER_ADMIN" &&
      ROLE_RANK[r] < ROLE_RANK[role] &&
      (r !== "QUESTION_UPLOADER" || role === "SUPER_ADMIN")
  );
}