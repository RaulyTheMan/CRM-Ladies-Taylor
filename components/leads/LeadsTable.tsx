"use client";

import { Lead, SortState } from "@/lib/types";
import { ChevronUp, ChevronDown, ChevronsUpDown, Check, ChevronDown as ChevronDownSm } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { LeadStatus, LEAD_STATUSES, STATUS_META } from "@/lib/status-store";

export const COLUMNS: { key: string; label: string; width: number }[] = [
  { key: "Name",     label: "NAME",     width: 200 },
  { key: "Company",  label: "COMPANY",  width: 160 },
  { key: "Phone",    label: "NUMBER",   width: 170 },
  { key: "Email",    label: "EMAIL",    width: 220 },
  { key: "Source",   label: "SOURCE",   width: 130 },
  { key: "Campaign", label: "CAMPAIGN", width: 180 },
];

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "0 20px 12px 0",
  fontFamily: "'Satoshi', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.07em",
  color: "rgba(37,34,34,0.45)",
  borderBottom: "1.5px solid #d9d9d9",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "14px 20px 14px 0",
  fontFamily: "'Satoshi', sans-serif",
  fontSize: 15,
  fontWeight: 400,
  color: "#252222",
  lineHeight: 1.3,
  borderBottom: "1px solid #f0f0f0",
};

interface LeadsTableProps {
  leads: Lead[];
  sort: SortState;
  selectedId: string | null;
  selectedIds: Set<string>;
  statuses: Record<string, LeadStatus>;
  visibleColumns?: Set<string>;
  onSort: (column: string) => void;
  onSelect: (lead: Lead) => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}

export function LeadsTable({ leads, sort, selectedId, selectedIds, statuses, visibleColumns, onSort, onSelect, onToggleSelect, onToggleAll, onStatusChange }: LeadsTableProps) {
  const activeCols = visibleColumns ? COLUMNS.filter(c => visibleColumns.has(c.key)) : COLUMNS;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [statusPickerId, setStatusPickerId] = useState<string | null>(null);
  const anySelected = selectedIds.size > 0;
  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l._id));

  if (leads.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 56 }}>
        <p style={{ fontSize: 14, color: "rgba(37,34,34,0.4)", fontFamily: "'Satoshi', sans-serif" }}>
          No leads match this filter.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", paddingLeft: 80, paddingRight: 40 }}
      onClick={() => setStatusPickerId(null)}>
      <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 32, paddingRight: 12 }}>
              <Checkbox checked={allSelected} indeterminate={anySelected && !allSelected} visible={anySelected} onChange={onToggleAll} />
            </th>
            {activeCols.map((col) => {
              const active = sort.column === col.key;
              return (
                <th key={col.key} style={{ ...TH, width: col.width, cursor: "pointer" }} onClick={() => onSort(col.key)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: active ? "#252222" : "rgba(37,34,34,0.45)" }}>{col.label}</span>
                    <SortIcon active={active} direction={sort.direction} />
                  </div>
                </th>
              );
            })}
            {/* Status column header */}
            <th style={{ ...TH, width: 160 }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const selected = selectedIds.has(lead._id);
            const hovered = hoveredId === lead._id;
            const showCheck = selected || hovered || anySelected;
            const status = statuses[lead._id] ?? null;

            return (
              <tr
                key={lead._id}
                style={{
                  background: selected ? "rgba(255,183,0,0.13)" : lead._id === selectedId ? "rgba(255,183,0,0.22)" : "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  setHoveredId(lead._id);
                  if (!selected && lead._id !== selectedId)
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,183,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  setHoveredId(null);
                  if (!selected && lead._id !== selectedId)
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <td style={{ ...TD, width: 32, paddingRight: 12 }} onClick={(e) => { e.stopPropagation(); onToggleSelect(lead._id); }}>
                  <Checkbox checked={selected} visible={showCheck} onChange={() => onToggleSelect(lead._id)} />
                </td>
                {activeCols.map((col) => (
                  <td key={col.key} style={{ ...TD, ...(col.key === "Name" ? { fontWeight: 500 } : {}) }} onClick={() => onSelect(lead)}>
                    {lead[col.key] || "—"}
                  </td>
                ))}

                {/* Status cell */}
                <td style={{ ...TD, paddingRight: 0 }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatusPickerId(statusPickerId === lead._id ? null : lead._id); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "3px 8px 3px 7px", borderRadius: 6, border: "none", cursor: "pointer",
                        background: status ? STATUS_META[status].bg : "rgba(37,34,34,0.06)",
                        color: status ? STATUS_META[status].text : "rgba(37,34,34,0.35)",
                        fontFamily: "'Satoshi', sans-serif", fontSize: 12, fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_META[status].dot, flexShrink: 0 }} />
                      )}
                      {status ?? "Set status"}
                      <ChevronDownSm size={10} strokeWidth={2.5} style={{ opacity: 0.5 }} />
                    </button>

                    {statusPickerId === lead._id && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0,
                        background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 300, minWidth: 180,
                        padding: "6px 0",
                      }}>
                        {LEAD_STATUSES.map((s) => {
                          const m = STATUS_META[s];
                          const active = s === status;
                          return (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(lead._id, s);
                                setStatusPickerId(null);
                              }}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                width: "100%", padding: "7px 12px", border: "none",
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Checkbox({ checked, indeterminate, visible, onChange }: {
  checked: boolean; indeterminate?: boolean; visible: boolean; onChange: () => void;
}) {
  return (
    <div onClick={(e) => { e.stopPropagation(); onChange(); }} style={{
      width: 16, height: 16, borderRadius: 4,
      border: checked || indeterminate ? "none" : "1.5px solid #d0d0d0",
      background: checked ? "#FFB700" : indeterminate ? "#FFB700" : "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", flexShrink: 0,
      opacity: visible ? 1 : 0, transition: "opacity 0.12s",
      pointerEvents: visible ? "auto" : "none",
    }}>
      {checked && <Check size={10} strokeWidth={3} color="#fff" />}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: "#fff", borderRadius: 1 }} />}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown size={11} strokeWidth={1.75} style={{ color: "rgba(37,34,34,0.25)" }} />;
  return direction === "asc"
    ? <ChevronUp size={11} strokeWidth={2} style={{ color: "#FFB700" }} />
    : <ChevronDown size={11} strokeWidth={2} style={{ color: "#FFB700" }} />;
}
