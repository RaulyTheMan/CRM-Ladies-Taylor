import { Lead } from "./types";

const TRASH_KEY = "crm_trash_v1";

export interface TrashedLead extends Lead {
  _trashedAt: string;
}

function getStore(): TrashedLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStore(items: TrashedLead[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRASH_KEY, JSON.stringify(items));
}

export function getTrashedLeads(): TrashedLead[] {
  return getStore();
}

export function moveToTrash(leads: Lead[]): void {
  const existing = getStore();
  const existingIds = new Set(existing.map((l) => l._id));
  const now = new Date().toISOString();
  const newItems = leads
    .filter((l) => !existingIds.has(l._id))
    .map((l) => ({ ...l, _trashedAt: now }));
  saveStore([...existing, ...newItems]);
}

export function restoreFromTrash(ids: string[]): TrashedLead[] {
  const store = getStore();
  const restored = store.filter((l) => ids.includes(l._id));
  saveStore(store.filter((l) => !ids.includes(l._id)));
  return restored;
}

export function permanentlyDelete(ids: string[]): void {
  saveStore(getStore().filter((l) => !ids.includes(l._id)));
}

export function clearTrash(): void {
  saveStore([]);
}
