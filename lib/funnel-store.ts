import { FunnelStage } from "./types";

const STORAGE_KEY = "crm_funnel_v1";

export type FunnelData = Record<string, FunnelStage>;

export function getFunnelData(): FunnelData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLeadStage(leadId: string, stage: FunnelStage): void {
  if (typeof window === "undefined") return;
  const data = getFunnelData();
  data[leadId] = stage;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLeadStage(leadId: string): FunnelStage {
  return getFunnelData()[leadId] ?? "New Deal";
}

export function setFunnelData(data: FunnelData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
