"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Lead, FunnelStage } from "@/lib/types";
import { getFunnelData, setLeadStage, FunnelData } from "@/lib/funnel-store";
import { getCachedLeads, cacheLeads } from "@/lib/lead-cache";
import { FunnelKanban } from "@/components/funnel/FunnelKanban";
import { FunnelList } from "@/components/funnel/FunnelList";
import { LayoutGrid, List, RefreshCw, AlertCircle } from "lucide-react";

type View = "kanban" | "list";
type LoadState = "idle" | "loading" | "error";

export default function FunnelPage() {
  const [leads, setLeads] = useState<Lead[]>(() => getCachedLeads());
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [view, setView] = useState<View>("kanban");
  const [stages, setStages] = useState<FunnelData>({});

  const fetchLeads = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      const fetched = data.leads ?? [];
      const manual = getCachedLeads().filter((l) => l._id.startsWith("manual_"));
      const all = [...manual, ...fetched];
      cacheLeads(all);
      setLeads(all);
      setStages(getFunnelData());
      setLoadState("idle");
    } catch {
      // If cache has data, don't show error banner — silently fail
      if (getCachedLeads().length > 0) {
        setLoadState("idle");
      } else {
        setLoadState("error");
      }
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleStageChange(id: string, stage: FunnelStage) {
    setLeadStage(id, stage);
    setStages((prev) => ({ ...prev, [id]: stage }));
  }

  const stagesWithDefault = useMemo(() => {
    const result: FunnelData = {};
    leads.forEach((l) => {
      result[l._id] = stages[l._id] ?? "New Deal";
    });
    return result;
  }, [leads, stages]);

  return (
    <div className="flex flex-col h-full">
      <header style={{ padding: "176px 40px 16px 80px", flexShrink: 0 }}>
        <div className="flex items-center gap-4 flex-wrap">
          <h1
            style={{ color: "#252222", fontFamily: "'Satoshi', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}
          >
            Pipeline
          </h1>
          {loadState === "idle" && leads.length > 0 && (
            <span style={{ color: "rgba(37,34,34,0.45)", fontFamily: "'Satoshi', sans-serif", fontSize: 20, fontWeight: 500 }}>
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={fetchLeads}
            disabled={loadState === "loading"}
            className="flex items-center gap-1.5 h-8 px-3 text-[12.5px] rounded-md border transition-colors"
            style={{
              borderColor: "var(--color-line)",
              color:
                loadState === "loading"
                  ? "var(--color-ink-ghost)"
                  : "var(--color-ink-dim)",
              background: "var(--color-canvas)",
            }}
          >
            <RefreshCw
              size={12}
              strokeWidth={2}
              className={loadState === "loading" ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <div
            className="flex items-center rounded-md border overflow-hidden"
            style={{ borderColor: "var(--color-line)" }}
          >
            <ViewButton
              active={view === "kanban"}
              onClick={() => setView("kanban")}
              icon={<LayoutGrid size={13} strokeWidth={1.75} />}
              label="Kanban"
            />
            <div style={{ width: 1, background: "var(--color-line)", height: 20 }} />
            <ViewButton
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<List size={13} strokeWidth={1.75} />}
              label="List"
            />
          </div>
        </div>
        </div>
      </header>

      {loadState === "error" && (
        <div
          className="flex items-center gap-2.5 mx-5 mt-4 px-4 py-3 rounded-md text-[13px]"
          style={{
            background: "oklch(97% 0.01 15)",
            color: "oklch(40% 0.12 15)",
          }}
        >
          <AlertCircle size={14} strokeWidth={1.75} />
          <span>
            Couldn't load leads. Check your connection or Sheet permissions.
          </span>
          <button
            onClick={fetchLeads}
            className="ml-auto text-[12px] underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === "loading" && leads.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          <p className="text-[13px]">Loading leads...</p>
        </div>
      ) : view === "kanban" ? (
        <FunnelKanban
          leads={leads}
          stages={stagesWithDefault}
          onStageChange={handleStageChange}
        />
      ) : (
        <FunnelList
          leads={leads}
          stages={stagesWithDefault}
          onStageChange={handleStageChange}
        />
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 h-8 text-[12px] transition-colors"
      style={{
        background: active ? "var(--color-row-active)" : "var(--color-canvas)",
        color: active ? "var(--color-accent)" : "var(--color-ink-dim)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
