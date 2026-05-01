export interface Lead {
  _id: string;
  Name: string;
  Email: string;
  Phone: string;
  Company: string;
  Source: string;
  Campaign: string;
  Industry: string;
  Message: string;
  "Submitted At": string;
  [key: string]: string;
}

export type FunnelStage =
  | "New Deal"
  | "Contact Made"
  | "Qualified"
  | "Converted"
  | "Won"
  | "Lost";

export const FUNNEL_STAGES: FunnelStage[] = [
  "New Deal",
  "Contact Made",
  "Qualified",
  "Converted",
];

export const FUNNEL_ALL_STAGES: FunnelStage[] = [
  "New Deal",
  "Contact Made",
  "Qualified",
  "Converted",
  "Won",
  "Lost",
];

export const STAGE_META: Record<FunnelStage, { bg: string; text: string; dot: string }> = {
  "New Deal": {
    bg: "rgba(255,183,0,0.12)",
    text: "#8a6000",
    dot: "#FFB700",
  },
  "Contact Made": {
    bg: "oklch(96% 0.01 210)",
    text: "oklch(40% 0.14 210)",
    dot: "oklch(50% 0.16 210)",
  },
  Qualified: {
    bg: "oklch(96% 0.01 290)",
    text: "oklch(40% 0.14 290)",
    dot: "oklch(50% 0.16 290)",
  },
  Converted: {
    bg: "oklch(96% 0.02 145)",
    text: "oklch(38% 0.14 145)",
    dot: "oklch(50% 0.18 145)",
  },
  Won: {
    bg: "oklch(96% 0.02 145)",
    text: "oklch(38% 0.14 145)",
    dot: "oklch(50% 0.18 145)",
  },
  Lost: {
    bg: "oklch(96% 0.01 15)",
    text: "oklch(40% 0.12 15)",
    dot: "oklch(52% 0.15 15)",
  },
};

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface FilterState {
  source: string;
  dateFrom: string;
  dateTo: string;
}
