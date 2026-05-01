const DEAL_STORE_KEY = "crm_deals_v2";

export type ActivityType = "Call" | "Meeting" | "Task" | "Deadline";
export type DealStatus = "active" | "won" | "lost";

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
}

export interface DealTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface DealData {
  service: string;
  value: string;
  status: DealStatus;
  activities: Activity[];
  notes: string;
  tasks: DealTask[];
}

type DealsStore = Record<string, DealData>;

function getStore(): DealsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DEAL_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: DealsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEAL_STORE_KEY, JSON.stringify(store));
}

export function getDeal(leadId: string): DealData {
  const store = getStore();
  return store[leadId] ?? {
    service: "",
    value: "",
    status: "active",
    activities: [],
    notes: "",
    tasks: [],
  };
}

export function saveDeal(leadId: string, data: DealData): void {
  const store = getStore();
  store[leadId] = data;
  saveStore(store);
}

export function deleteDeal(leadId: string): void {
  const store = getStore();
  delete store[leadId];
  saveStore(store);
}

export function deleteDeals(leadIds: string[]): void {
  const store = getStore();
  leadIds.forEach((id) => delete store[id]);
  saveStore(store);
}
