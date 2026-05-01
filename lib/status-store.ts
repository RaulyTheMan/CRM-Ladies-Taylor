const STATUS_KEY = "crm_lead_status_v1";

export type LeadStatus =
  | "Not Reached"
  | "Not Picked"
  | "Rejected"
  | "Junk"
  | "Call Set"
  | "Proposal Awaiting"
  | "Closed";

export const LEAD_STATUSES: LeadStatus[] = [
  "Not Reached",
  "Not Picked",
  "Rejected",
  "Junk",
  "Call Set",
  "Proposal Awaiting",
  "Closed",
];

export const STATUS_META: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
  "Not Reached":       { bg: "rgba(156,163,175,0.15)", text: "#6b7280", dot: "#9ca3af" },
  "Not Picked":        { bg: "rgba(75,85,99,0.15)",    text: "#374151", dot: "#4b5563" },
  "Rejected":          { bg: "rgba(239,68,68,0.12)",   text: "#dc2626", dot: "#ef4444" },
  "Junk":              { bg: "rgba(17,24,39,0.10)",    text: "#111827", dot: "#374151" },
  "Call Set":          { bg: "rgba(139,92,246,0.12)",  text: "#7c3aed", dot: "#8b5cf6" },
  "Proposal Awaiting": { bg: "rgba(249,115,22,0.12)",  text: "#ea580c", dot: "#f97316" },
  "Closed":            { bg: "rgba(34,197,94,0.12)",   text: "#16a34a", dot: "#22c55e" },
};

type StatusStore = Record<string, LeadStatus>;

function getStore(): StatusStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: StatusStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATUS_KEY, JSON.stringify(store));
}

export function getLeadStatus(leadId: string): LeadStatus | null {
  return getStore()[leadId] ?? null;
}

export function setLeadStatus(leadId: string, status: LeadStatus): void {
  const store = getStore();
  store[leadId] = status;
  saveStore(store);
}

export function getAllStatuses(): StatusStore {
  return getStore();
}
