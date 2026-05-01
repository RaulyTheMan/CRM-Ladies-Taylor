"use client";

import { Lead, FunnelStage, FUNNEL_STAGES, STAGE_META } from "@/lib/types";
import { setLeadStage } from "@/lib/funnel-store";
import { X, Mail, Phone, Globe, MessageSquare, Calendar } from "lucide-react";
import { useState } from "react";

interface LeadDetailPanelProps {
  lead: Lead;
  currentStage: FunnelStage;
  onClose: () => void;
  onStageChange: (id: string, stage: FunnelStage) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function LeadDetailPanel({
  lead,
  currentStage,
  onClose,
  onStageChange,
}: LeadDetailPanelProps) {
  const [stage, setStage] = useState<FunnelStage>(currentStage);
  const meta = STAGE_META[stage];

  function handleStageChange(s: FunnelStage) {
    setStage(s);
    setLeadStage(lead._id, s);
    onStageChange(lead._id, s);
  }

  return (
    <div
      className="w-[400px] flex-shrink-0 flex flex-col h-full border-l overflow-y-auto scrollbar-thin"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-canvas)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10 bg-canvas"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div>
          <h2
            className="text-[15px] font-semibold leading-tight"
            style={{ color: "var(--color-ink)" }}
          >
            {lead.Name || "—"}
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ink-ghost)" }}>
            Lead detail
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "var(--color-ink-dim)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-row-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 px-5 py-4 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Field icon={Mail} label="Email" value={lead.Email} />
          <Field icon={Phone} label="Phone" value={lead.Phone} />
          <Field icon={Globe} label="Source" value={lead.Source} />
          <Field
            icon={Calendar}
            label="Submitted"
            value={formatDate(lead["Submitted At"])}
          />
          {lead.Message && (
            <Field icon={MessageSquare} label="Message" value={lead.Message} multiline />
          )}
        </div>

        <div
          className="border-t pt-4"
          style={{ borderColor: "var(--color-line-faint)" }}
        >
          <p
            className="text-[11px] uppercase tracking-wider font-medium mb-2"
            style={{ color: "var(--color-ink-ghost)" }}
          >
            Funnel stage
          </p>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium mb-3"
            style={{ background: meta.bg, color: meta.text }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: meta.dot }}
            />
            {stage}
          </div>
          <div className="flex flex-col gap-1">
            {FUNNEL_STAGES.map((s) => {
              const m = STAGE_META[s];
              const active = s === stage;
              return (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-left transition-colors"
                  style={{
                    background: active ? m.bg : "transparent",
                    color: active ? m.text : "var(--color-ink-dim)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--color-row-hover)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--color-ink)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--color-ink-dim)";
                    }
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: m.dot }}
                  />
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex-shrink-0">
        <Icon
          size={13}
          strokeWidth={1.75}
          style={{ color: "var(--color-ink-ghost)" }}
        />
      </div>
      <div className="min-w-0">
        <p
          className="text-[11px] uppercase tracking-wider font-medium leading-none mb-1"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          {label}
        </p>
        <p
          className={`text-[13.5px] leading-snug ${multiline ? "" : "truncate"}`}
          style={{ color: "var(--color-ink)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
