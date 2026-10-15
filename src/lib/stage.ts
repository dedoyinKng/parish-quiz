// Lowest stage first. Each stage has its own colour (see globals.css).
export const STAGES = ["PARISH", "AREA", "ZONE", "PROVINCE"] as const;

export const STAGE_LABEL: Record<string, string> = {
  PARISH: "Parish",
  AREA: "Area",
  ZONE: "Zone",
  PROVINCE: "Province",
};

export const STAGE_PLURAL: Record<string, string> = {
  PARISH: "Parishes",
  AREA: "Areas",
  ZONE: "Zones",
  PROVINCE: "Provinces",
};

export function stageClass(type: string) {
  return `stage-${type.toLowerCase()}`;
}