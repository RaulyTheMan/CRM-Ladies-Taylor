import { Lead } from "./types";

const JUNK_KEY = "crm_junk_v1";

export interface JunkedLead extends Lead {
  _junkedAt: string;
}

function getStore(): JunkedLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JUNK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStore(items: JunkedLead[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(JUNK_KEY, JSON.stringify(items));
}

export function getJunkedLeads(): JunkedLead[] {
  return getStore();
}

export function moveToJunk(leads: Lead[]): void {
  const existing = getStore();
  const existingIds = new Set(existing.map((l) => l._id));
  const now = new Date().toISOString();
  const newItems = leads
    .filter((l) => !existingIds.has(l._id))
    .map((l) => ({ ...l, _junkedAt: now }));
  saveStore([...existing, ...newItems]);
}

export function restoreFromJunk(ids: string[]): JunkedLead[] {
  const store = getStore();
  const restored = store.filter((l) => ids.includes(l._id));
  saveStore(store.filter((l) => !ids.includes(l._id)));
  return restored;
}

export function permanentlyDelete(ids: string[]): void {
  saveStore(getStore().filter((l) => !ids.includes(l._id)));
}

export function clearJunk(): void {
  saveStore([]);
}
