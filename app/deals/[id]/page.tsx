"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lead } from "@/lib/types";
import { getCachedLead, getCachedLeads, cacheLeads } from "@/lib/lead-cache";
import { getDeal, saveDeal, DealData, Activity, ActivityType, DealTask } from "@/lib/deal-store";
import { getLeadStage, setLeadStage } from "@/lib/funnel-store";
import { FunnelStage, FUNNEL_STAGES, STAGE_META } from "@/lib/types";
import { LeadStatus, LEAD_STATUSES, STATUS_META, getLeadStatus, setLeadStatus } from "@/lib/status-store";
import { Pencil, Check, Clock, ChevronDown, X, AlertCircle, Phone, Users, Flag, SquareCheck } from "lucide-react";

type Tab = "Activity" | "Timeline" | "Tasks" | "Notes" | "Files";
const TABS: Tab[] = ["Activity", "Timeline", "Tasks", "Notes", "Files"];
const ACTIVITY_TYPES: ActivityType[] = ["Call", "Meeting", "Task", "Deadline"];

const ACTIVITY_TYPE_META: Record<ActivityType, { bg: string; color: string; dot: string; icon: React.ElementType }> = {
  Call:     { bg: "rgba(34,197,94,0.10)",  color: "#16a34a", dot: "#22c55e", icon: Phone },
  Meeting:  { bg: "rgba(59,130,246,0.10)", color: "#2563eb", dot: "#3b82f6", icon: Users },
  Task:     { bg: "rgba(255,183,0,0.12)",  color: "#b07d00", dot: "#FFB700", icon: SquareCheck },
  Deadline: { bg: "rgba(239,68,68,0.10)",  color: "#dc2626", dot: "#ef4444", icon: Flag },
};

function relativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateStr));
}

function fmtDateTime(s: string): string {
  if (!s) return "";
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [deal, setDeal] = useState<DealData>({
    service: "", value: "", status: "active", activities: [], notes: "", tasks: [],
  });
  const [stage, setStage] = useState<FunnelStage>("New Deal");
  const [tab, setTab] = useState<Tab>("Activity");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editService, setEditService] = useState("");
  const [editValue, setEditValue] = useState("");

  // Activity form
  const [activityText, setActivityText] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("Call");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Notes
  const [notesText, setNotesText] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tasks
  const [taskInput, setTaskInput] = useState("");

  // Status
  const [leadStatus, setLeadStatusState] = useState<LeadStatus | null>(null);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  useEffect(() => {
    const cached = getCachedLead(id);
    if (cached) {
      setLead(cached);
      setEditName(cached.Name);
    } else {
      fetch("/api/leads")
        .then((r) => r.json())
        .then((data) => {
          const found = (data.leads ?? []).find((l: Lead) => l._id === id);
          if (found) {
            setLead(found);
            setEditName(found.Name);
          } else {
            setLoadError(true);
          }
        })
        .catch(() => setLoadError(true));
    }

    const d = getDeal(id);
    setDeal(d);
    setEditService(d.service);
    setEditValue(d.value ?? "");
    setNotesText(d.notes);
    setStage(getLeadStage(id));
    setLeadStatusState(getLeadStatus(id));
  }, [id]);

  function persistDeal(updated: DealData) {
    setDeal(updated);
    saveDeal(id, updated);
  }

  function handleSaveEdit() {
    if (!lead) return;
    const updated = { ...deal, service: editService, value: editValue };
    persistDeal(updated);
    const updatedLead = { ...lead, Name: editName };
    setLead(updatedLead);
    // Persist name change back to cache
    const cached = getCachedLeads();
    cacheLeads(cached.map((l) => (l._id === id ? updatedLead : l)));
    setEditing(false);
  }

  function handleStatus(s: "won" | "lost") {
    const next: "active" | "won" | "lost" = deal.status === s ? "active" : s;
    const updated = { ...deal, status: next };
    persistDeal(updated);
    if (next === "won") {
      setLeadStage(id, "Won");
      setStage("Won");
    } else if (next === "lost") {
      setLeadStage(id, "Lost");
      setStage("Lost");
    } else {
      const prev = getLeadStage(id);
      setStage(prev === "Won" || prev === "Lost" ? "New Deal" : prev);
    }
  }

  function handleAddActivity() {
    if (!activityText.trim()) return;
    if (dateFrom && dateTo && dateFrom > dateTo) return;
    const act: Activity = {
      id: uid(),
      type: activityType,
      text: activityText.trim(),
      dateFrom,
      dateTo,
      createdAt: new Date().toISOString(),
    };
    const updated = { ...deal, activities: [act, ...deal.activities] };
    persistDeal(updated);
    setActivityText("");
    setDateFrom("");
    setDateTo("");
  }

  function handleDeleteActivity(actId: string) {
    persistDeal({ ...deal, activities: deal.activities.filter((a) => a.id !== actId) });
  }

  function handleAddTask() {
    if (!taskInput.trim()) return;
    const task: DealTask = {
      id: uid(),
      text: taskInput.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    const updated = { ...deal, tasks: [...deal.tasks, task] };
    persistDeal(updated);
    setTaskInput("");
  }

  function handleDeleteTask(taskId: string) {
    persistDeal({ ...deal, tasks: deal.tasks.filter((t) => t.id !== taskId) });
  }

  function toggleTask(taskId: string) {
    const updated = {
      ...deal,
      tasks: deal.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t),
    };
    persistDeal(updated);
  }

  function handleSaveNotes() {
    persistDeal({ ...deal, notes: notesText });
    if (notesSavedTimer.current) clearTimeout(notesSavedTimer.current);
    setNotesSaved(true);
    notesSavedTimer.current = setTimeout(() => setNotesSaved(false), 1500);
  }

  function handleStageChange(s: FunnelStage) {
    setLeadStage(id, s);
    setStage(s);
    if (s === "Won") persistDeal({ ...deal, status: "won" });
    else if (s === "Lost") persistDeal({ ...deal, status: "lost" });
    else persistDeal({ ...deal, status: "active" });
  }

  if (loadError) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AlertCircle size={28} strokeWidth={1.5} style={{ color: "rgba(37,34,34,0.25)" }} />
        <p style={{ color: "rgba(37,34,34,0.45)", fontFamily: "'Satoshi', sans-serif", fontSize: 14, margin: 0 }}>
          Lead not found.
        </p>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 13, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: "'Satoshi', sans-serif", textDecoration: "underline" }}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(37,34,34,0.4)", fontFamily: "'Satoshi', sans-serif", fontSize: 14 }}>
          Loading deal…
        </p>
      </div>
    );
  }

  const stageMeta = STAGE_META[stage];

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
      onClick={() => setStatusPickerOpen(false)}
    >
      {/* Top padding area */}
      <div style={{ paddingTop: 60, paddingLeft: 80, paddingRight: 60 }}>

        {/* Breadcrumb */}
        <button
          onClick={() => router.back()}
          style={{
            fontSize: 13,
            color: "rgba(37,34,34,0.4)",
            fontFamily: "'Satoshi', sans-serif",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginBottom: 8,
            letterSpacing: "0.01em",
          }}
        >
          Deals
        </button>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          {editing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "#252222",
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                border: "none",
                borderBottom: "2px solid #FFB700",
                outline: "none",
                background: "transparent",
                fontFamily: "'Satoshi', sans-serif",
                width: "100%",
                maxWidth: 500,
              }}
            />
          ) : (
            <h1 style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#252222",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: 0,
            }}>
              {lead.Name || "—"}
            </h1>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 8 }}>
            {editing ? (
              <button
                onClick={handleSaveEdit}
                style={{
                  fontSize: 13,
                  color: "#fff",
                  background: "#FFB700",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 14px",
                  cursor: "pointer",
                  fontFamily: "'Satoshi', sans-serif",
                  fontWeight: 600,
                }}
              >
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{
                  fontSize: 13,
                  color: "rgba(37,34,34,0.45)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "'Satoshi', sans-serif",
                }}
              >
                edit <Pencil size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          <FieldRow label="Company" value={lead.Company} />
          {editing ? (
            <>
              <div style={{ display: "flex", gap: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#252222", minWidth: 90 }}>Service</span>
                <input
                  value={editService}
                  onChange={(e) => setEditService(e.target.value)}
                  placeholder="e.g. Branding"
                  style={{
                    fontSize: 15,
                    color: "#252222",
                    border: "none",
                    borderBottom: "1.5px solid #FFB700",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "'Satoshi', sans-serif",
                    width: 200,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#252222", minWidth: 90 }}>Value</span>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="e.g. ₹1,20,000"
                  style={{
                    fontSize: 15,
                    color: "#252222",
                    border: "none",
                    borderBottom: "1.5px solid #FFB700",
                    outline: "none",
                    background: "transparent",
                    fontFamily: "'Satoshi', sans-serif",
                    width: 200,
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <FieldRow label="Service" value={deal.service || "—"} />
              {deal.value && <FieldRow label="Value" value={deal.value} />}
            </>
          )}
          <FieldRow label="Phone" value={lead.Phone} link={`tel:${lead.Phone}`} />
          <FieldRow label="Mail" value={lead.Email} link={`mailto:${lead.Email}`} />
          {lead.Industry && <FieldRow label="Industry" value={lead.Industry} />}
          {lead.Campaign && <FieldRow label="Campaign" value={lead.Campaign} />}

          {/* Status picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#252222", minWidth: 90, fontFamily: "'Satoshi', sans-serif" }}>
              Status
            </span>
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setStatusPickerOpen((o) => !o); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px 4px 8px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: leadStatus ? STATUS_META[leadStatus].bg : "rgba(37,34,34,0.06)",
                  color: leadStatus ? STATUS_META[leadStatus].text : "rgba(37,34,34,0.35)",
                  fontFamily: "'Satoshi', sans-serif", fontSize: 13, fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {leadStatus && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_META[leadStatus].dot, flexShrink: 0 }} />
                )}
                {leadStatus ?? "Set status"}
                <ChevronDown size={11} strokeWidth={2.5} style={{ opacity: 0.5 }} />
              </button>

              {statusPickerOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0,
                    background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 300, minWidth: 190,
                    padding: "6px 0",
                  }}
                >
                  {LEAD_STATUSES.map((s) => {
                    const m = STATUS_META[s];
                    const active = s === leadStatus;
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          setLeadStatusState(s);
                          setLeadStatus(id, s);
                          setStatusPickerOpen(false);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", padding: "7px 14px", border: "none",
                          background: active ? m.bg : "transparent",
                          cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                          fontSize: 13, fontWeight: active ? 600 : 400,
                          color: active ? m.text : "#252222", textAlign: "left",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                        {s}
                        {active && <Check size={11} strokeWidth={2.5} style={{ marginLeft: "auto", color: m.dot }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stage pill */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
              background: stageMeta.bg,
              color: stageMeta.text,
              marginBottom: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: stageMeta.dot, display: "inline-block" }} />
            {stage}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FUNNEL_STAGES.map((s) => {
              const m = STAGE_META[s];
              const active = s === stage;
              return (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  style={{
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 12,
                    border: `1.5px solid ${active ? m.dot : "rgba(37,34,34,0.15)"}`,
                    background: active ? m.bg : "transparent",
                    color: active ? m.text : "rgba(37,34,34,0.5)",
                    cursor: "pointer",
                    fontFamily: "'Satoshi', sans-serif",
                    fontWeight: active ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabs row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1.5px solid #e8e8e8",
          marginTop: 28,
          marginBottom: 0,
        }}>
          <div style={{ display: "flex", flex: 1 }}>
            {TABS.map((t) => {
              const count = t === "Activity" ? deal.activities.length
                          : t === "Tasks"    ? deal.tasks.length
                          : null;
              const active = t === tab;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#252222" : "rgba(37,34,34,0.45)",
                    background: "none", border: "none",
                    borderBottom: active ? "2px solid #252222" : "2px solid transparent",
                    padding: "11px 16px 11px 0",
                    marginRight: 4, marginBottom: "-1.5px",
                    cursor: "pointer",
                    fontFamily: "'Satoshi', sans-serif",
                    transition: "color 0.12s",
                  }}
                >
                  {t}
                  {count !== null && count > 0 && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, lineHeight: 1,
                      background: active ? "#252222" : "rgba(37,34,34,0.08)",
                      color: active ? "#fff" : "rgba(37,34,34,0.5)",
                      borderRadius: 10, padding: "2px 6px",
                      fontFamily: "'Satoshi', sans-serif",
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* WON / LOST */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingBottom: 4 }}>
            <button onClick={() => handleStatus("won")} style={{
              padding: "5px 14px", borderRadius: 6, border: "none",
              background: deal.status === "won" ? "#22c55e" : "rgba(34,197,94,0.12)",
              color: deal.status === "won" ? "#fff" : "#16a34a",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Satoshi', sans-serif", letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}>WON</button>
            <button onClick={() => handleStatus("lost")} style={{
              padding: "5px 14px", borderRadius: 6, border: "none",
              background: deal.status === "lost" ? "#ef4444" : "rgba(239,68,68,0.12)",
              color: deal.status === "lost" ? "#fff" : "#dc2626",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Satoshi', sans-serif", letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}>LOST</button>
          </div>
        </div>

        {/* ── ACTIVITY ── */}
        {tab === "Activity" && (
          <div style={{ maxWidth: 620, paddingTop: 20 }}>

            {/* Log input card */}
            <div style={{
              border: "1.5px solid #e8e8e8", borderRadius: 10,
              overflow: "hidden", marginBottom: 28, background: "#fff",
            }}>
              <input
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
                placeholder="Log an activity…"
                style={{
                  width: "100%", padding: "13px 16px",
                  border: "none", outline: "none",
                  fontSize: 14, fontFamily: "'Satoshi', sans-serif",
                  color: "#252222", background: "transparent",
                }}
              />
              <div style={{
                display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
                padding: "8px 12px 10px",
                borderTop: "1px solid #f0f0f0",
                background: "#fafafa",
              }}>
                {/* Type pills */}
                {ACTIVITY_TYPES.map((t) => {
                  const m = ACTIVITY_TYPE_META[t];
                  const TypeIcon = m.icon;
                  const active = t === activityType;
                  return (
                    <button key={t} onClick={() => setActivityType(t)} style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                      border: active ? `1.5px solid ${m.dot}` : "1.5px solid #e0e0e0",
                      background: active ? m.bg : "transparent",
                      color: active ? m.color : "rgba(37,34,34,0.45)",
                      fontSize: 12, fontWeight: 600,
                      fontFamily: "'Satoshi', sans-serif", transition: "all 0.12s",
                    }}>
                      <TypeIcon size={11} strokeWidth={2} />
                      {t}
                    </button>
                  );
                })}

                {/* Date inputs + Add */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={12} strokeWidth={1.5} style={{ color: "rgba(37,34,34,0.3)", flexShrink: 0 }} />
                  <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    style={{ fontSize: 11.5, padding: "3px 8px", border: "1px solid #e0e0e0", borderRadius: 6, fontFamily: "'Satoshi', sans-serif", color: "#252222", outline: "none", background: "#fff" }} />
                  {dateFrom && (
                    <>
                      <span style={{ color: "rgba(37,34,34,0.3)", fontSize: 12 }}>→</span>
                      <input type="datetime-local" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
                        style={{ fontSize: 11.5, padding: "3px 8px", border: dateTo && dateTo < dateFrom ? "1px solid #ef4444" : "1px solid #e0e0e0", borderRadius: 6, fontFamily: "'Satoshi', sans-serif", color: "#252222", outline: "none", background: "#fff" }} />
                    </>
                  )}
                  <button
                    onClick={handleAddActivity}
                    disabled={!activityText.trim() || (!!dateFrom && !!dateTo && dateTo < dateFrom)}
                    style={{
                      padding: "4px 14px", borderRadius: 6, border: "none",
                      background: activityText.trim() && !(dateFrom && dateTo && dateTo < dateFrom) ? "#FFB700" : "rgba(37,34,34,0.10)",
                      color: activityText.trim() && !(dateFrom && dateTo && dateTo < dateFrom) ? "#fff" : "rgba(37,34,34,0.3)",
                      fontSize: 12.5, fontWeight: 600, cursor: activityText.trim() ? "pointer" : "default",
                      fontFamily: "'Satoshi', sans-serif", transition: "background 0.12s",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Feed */}
            {deal.activities.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "rgba(37,34,34,0.35)", fontFamily: "'Satoshi', sans-serif" }}>No activity logged yet.</p>
            ) : (
              deal.activities.map((a) => {
                const m = ACTIVITY_TYPE_META[a.type];
                const TypeIcon = m.icon;
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "13px 0", borderBottom: "1px solid #f2f2f2",
                  }}>
                    {/* Type icon badge */}
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, background: m.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <TypeIcon size={14} strokeWidth={2} color={m.color} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: m.color, letterSpacing: "0.06em", fontFamily: "'Satoshi', sans-serif" }}>
                            {a.type.toUpperCase()}
                          </span>
                          <p style={{ fontSize: 13.5, color: "#252222", margin: "3px 0 0", fontFamily: "'Satoshi', sans-serif", lineHeight: 1.4 }}>
                            {a.text}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 11.5, color: "rgba(37,34,34,0.35)", fontFamily: "'Satoshi', sans-serif", whiteSpace: "nowrap" }}>
                            {relativeTime(a.createdAt)}
                          </span>
                          <button onClick={() => handleDeleteActivity(a.id)} style={{
                            background: "none", border: "none", cursor: "pointer", padding: 2,
                            color: "rgba(37,34,34,0.2)", display: "flex", alignItems: "center",
                          }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(37,34,34,0.2)")}
                          >
                            <X size={12} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                      {a.dateFrom && (
                        <p style={{ fontSize: 11.5, color: "rgba(37,34,34,0.4)", margin: "5px 0 0", fontFamily: "'Satoshi', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                          {fmtDateTime(a.dateFrom)}{a.dateTo ? ` → ${fmtDateTime(a.dateTo)}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TIMELINE ── */}
        {tab === "Timeline" && (
          <div style={{ maxWidth: 580, paddingTop: 20 }}>
            {deal.activities.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "rgba(37,34,34,0.35)", fontFamily: "'Satoshi', sans-serif" }}>
                No activity yet. Log some from the Activity tab.
              </p>
            ) : (
              [...deal.activities]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((a, i, arr) => {
                  const m = ACTIVITY_TYPE_META[a.type];
                  const TypeIcon = m.icon;
                  return (
                    <div key={a.id} style={{ display: "flex", gap: 14 }}>
                      {/* Timeline spine */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, background: m.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 2,
                        }}>
                          <TypeIcon size={13} strokeWidth={2} color={m.color} />
                        </div>
                        {i < arr.length - 1 && (
                          <div style={{ width: 1.5, flex: 1, background: "#ebebeb", minHeight: 20, margin: "4px 0" }} />
                        )}
                      </div>
                      {/* Content */}
                      <div style={{ paddingBottom: 20, flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: m.color, letterSpacing: "0.06em", fontFamily: "'Satoshi', sans-serif" }}>
                            {a.type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 11.5, color: "rgba(37,34,34,0.35)", fontFamily: "'Satoshi', sans-serif", flexShrink: 0 }}>
                            {relativeTime(a.createdAt)}
                          </span>
                        </div>
                        <p style={{ fontSize: 13.5, color: "#252222", margin: "3px 0 0", fontFamily: "'Satoshi', sans-serif", lineHeight: 1.4 }}>
                          {a.text}
                        </p>
                        {a.dateFrom && (
                          <p style={{ fontSize: 11.5, color: "rgba(37,34,34,0.4)", margin: "4px 0 0", fontFamily: "'Satoshi', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={10} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                            {fmtDateTime(a.dateFrom)}{a.dateTo ? ` → ${fmtDateTime(a.dateTo)}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ── TASKS ── */}
        {tab === "Tasks" && (
          <div style={{ maxWidth: 520, paddingTop: 20 }}>
            {/* Add input */}
            <div style={{
              display: "flex", gap: 8, marginBottom: 20,
              border: "1.5px solid #e8e8e8", borderRadius: 10,
              overflow: "hidden", background: "#fff",
            }}>
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Add a task…"
                style={{
                  flex: 1, padding: "12px 16px",
                  border: "none", outline: "none",
                  fontSize: 14, fontFamily: "'Satoshi', sans-serif", color: "#252222", background: "transparent",
                }}
              />
              <button onClick={handleAddTask} disabled={!taskInput.trim()} style={{
                padding: "0 18px", border: "none",
                background: taskInput.trim() ? "#FFB700" : "rgba(37,34,34,0.06)",
                color: taskInput.trim() ? "#fff" : "rgba(37,34,34,0.3)",
                fontSize: 13, fontWeight: 600, cursor: taskInput.trim() ? "pointer" : "default",
                fontFamily: "'Satoshi', sans-serif", borderRadius: 0, transition: "background 0.12s",
              }}>
                Add
              </button>
            </div>

            {/* Task list */}
            {deal.tasks.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "rgba(37,34,34,0.35)", fontFamily: "'Satoshi', sans-serif" }}>No tasks yet.</p>
            ) : (
              <div>
                {deal.tasks.map((task) => (
                  <div key={task.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 0", borderBottom: "1px solid #f2f2f2",
                  }}>
                    <div onClick={() => toggleTask(task.id)} style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                      border: `2px solid ${task.done ? "#FFB700" : "#d4d4d4"}`,
                      background: task.done ? "#FFB700" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {task.done && <Check size={10} strokeWidth={3} color="#fff" />}
                    </div>
                    <span onClick={() => toggleTask(task.id)} style={{
                      flex: 1, fontSize: 14,
                      color: task.done ? "rgba(37,34,34,0.32)" : "#252222",
                      textDecoration: task.done ? "line-through" : "none",
                      fontFamily: "'Satoshi', sans-serif", cursor: "pointer",
                    }}>
                      {task.text}
                    </span>
                    <span style={{ fontSize: 11.5, color: "rgba(37,34,34,0.3)", fontFamily: "'Satoshi', sans-serif" }}>
                      {relativeTime(task.createdAt)}
                    </span>
                    <button onClick={() => handleDeleteTask(task.id)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 2,
                      color: "rgba(37,34,34,0.2)", display: "flex", alignItems: "center",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(37,34,34,0.2)")}
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NOTES ── */}
        {tab === "Notes" && (
          <div style={{ maxWidth: 600, paddingTop: 20 }}>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Write notes about this deal…"
              rows={10}
              style={{
                width: "100%", padding: "14px 16px",
                borderRadius: 10, border: "1.5px solid #e8e8e8",
                fontSize: 14, lineHeight: 1.65,
                fontFamily: "'Satoshi', sans-serif", color: "#252222",
                outline: "none", resize: "vertical", boxSizing: "border-box", background: "#fff",
              }}
            />
            <button onClick={handleSaveNotes} style={{
              marginTop: 10, fontSize: 13, padding: "7px 18px",
              borderRadius: 8, border: "none",
              background: notesSaved ? "#22c55e" : "#FFB700",
              color: "#fff", cursor: "pointer",
              fontFamily: "'Satoshi', sans-serif", fontWeight: 600,
              transition: "background 0.2s",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {notesSaved ? <><Check size={13} strokeWidth={2.5} /> Saved</> : "Save notes"}
            </button>
          </div>
        )}

        {/* ── FILES ── */}
        {tab === "Files" && (
          <p style={{ paddingTop: 20, fontSize: 13.5, color: "rgba(37,34,34,0.35)", fontFamily: "'Satoshi', sans-serif" }}>
            File uploads coming soon.
          </p>
        )}

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

function FieldRow({ label, value, link }: { label: string; value: string; link?: string }) {
  const valueEl = link ? (
    <a
      href={link}
      style={{
        fontSize: 15,
        color: "#252222",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        fontFamily: "'Satoshi', sans-serif",
      }}
    >
      {value || "—"}
    </a>
  ) : (
    <span style={{ fontSize: 15, color: "#252222", fontFamily: "'Satoshi', sans-serif" }}>
      {value || "—"}
    </span>
  );

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#252222", minWidth: 90, fontFamily: "'Satoshi', sans-serif" }}>
        {label}
      </span>
      {valueEl}
    </div>
  );
}
