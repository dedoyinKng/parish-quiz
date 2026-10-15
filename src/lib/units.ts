import type { OrgType } from "@prisma/client";

export const PREFIX: Record<OrgType, string> = {
  PROVINCE: "PRV",
  ZONE: "ZN",
  AREA: "AR",
  PARISH: "PAR",
};

export const PARENT_TYPE: Record<OrgType, OrgType | null> = {
  PROVINCE: null,
  ZONE: "PROVINCE",
  AREA: "ZONE",
  PARISH: "AREA",
};

export const TYPE_ORDER: OrgType[] = ["PROVINCE", "ZONE", "AREA", "PARISH"];

export function maxSuffix(codes: string[]): number {
  let max = 0;
  for (const c of codes) {
    const m = /-(\d+)$/.exec(c);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export function makeCode(type: OrgType, n: number): string {
  return `${PREFIX[type]}-${String(n).padStart(3, "0")}`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}