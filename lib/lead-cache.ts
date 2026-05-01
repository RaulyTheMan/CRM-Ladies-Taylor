import { Lead } from "./types";

const CACHE_KEY = "crm_leads_cache_v1";

export function cacheLeads(leads: Lead[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(leads));
  } catch {}
}

export function getCachedLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCachedLead(id: string): Lead | null {
  return getCachedLeads().find((l) => l._id === id) ?? null;
}
