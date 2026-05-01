"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lead, FunnelStage, FUNNEL_ALL_STAGES, STAGE_META } from "@/lib/types";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

interface FunnelListProps {
  leads: Lead[];
  stages: Record<string, FunnelStage>;
  onStageChange: (id: string, stage: FunnelStage) => void;
}

export function FunnelList({ leads, stages, onStageChange }: FunnelListProps) {
  const router = useRouter();
  const grouped = FUNNEL_ALL_STAGES.reduce<Record<FunnelStage, Lead[]>>(
    (acc, s) => {
      acc[s] = leads.filter((l) => (stages[l._id] ?? "New Deal") === s);
      return acc;
    },
    {} as Record<FunnelStage, Lead[]>
  );

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full min-w-[640px] border-collapse">
        <tbody>
          {FUNNEL_ALL_STAGES.map((stage) => {
            const group = grouped[stage];
            const meta = STAGE_META[stage];
            return (
              <React.Fragment key={stage}>
                <tr>
                  <td
                    colSpan={5}
                    className="sticky top-0 z-10 px-5 py-2.5 border-b border-t"
                    style={{
                      background: "var(--color-canvas)",
                      borderColor: "var(--color-line)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: meta.dot }}
                      />
                      <span
                        className="text-[12.5px] font-semibold"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {stage}
                      </span>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: "var(--color-line-faint)",
                          color: "var(--color-ink-ghost)",
                        }}
                      >
                        {group.length}
                      </span>
                    </div>
                  </td>
                </tr>
                {group.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-3 text-[12.5px]"
                      style={{ color: "var(--color-ink-ghost)" }}
                    >
                      No leads here yet
                    </td>
                  </tr>
                ) : (
                  group.map((lead) => (
                    <tr
                      key={lead._id}
                      className="border-b transition-colors"
                      style={{ borderColor: "var(--color-line-faint)", cursor: "pointer" }}
                      onClick={() => router.push(`/deals/${lead._id}`)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--color-row-hover)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <td className="px-5 py-2.5 w-[180px]">
                        <span
                          className="text-[13.5px] font-medium"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {lead.Name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 w-[200px]">
                        <span
                          className="text-[13px] truncate block max-w-[200px]"
                          style={{ color: "var(--color-ink-dim)" }}
                        >
                          {lead.Email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {lead.Source ? (
                          <span
                            className="text-[11.5px] px-2 py-0.5 rounded font-medium whitespace-nowrap"
                            style={{
                              background: "var(--color-accent-dim)",
                              color: "var(--color-accent)",
                            }}
                          >
                            {lead.Source}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 w-[130px] text-right">
                        <span
                          className="text-[12.5px] whitespace-nowrap"
                          style={{ color: "var(--color-ink-ghost)" }}
                        >
                          {formatDate(lead["Submitted At"])}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 w-[140px]" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={stages[lead._id] ?? "New Deal"}
                          onChange={(e) =>
                            onStageChange(
                              lead._id,
                              e.target.value as FunnelStage
                            )
                          }
                          className="text-[12px] px-2 py-1 rounded-md border appearance-none cursor-pointer w-full"
                          style={{
                            borderColor: "var(--color-line)",
                            color: "var(--color-ink-dim)",
                            background: "var(--color-canvas)",
                          }}
                        >
                          {FUNNEL_ALL_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
