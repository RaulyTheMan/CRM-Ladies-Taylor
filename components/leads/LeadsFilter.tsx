"use client";

import { FilterState } from "@/lib/types";
import { X } from "lucide-react";

interface LeadsFilterProps {
  filters: FilterState;
  sources: string[];
  onChange: (f: FilterState) => void;
}

export function LeadsFilter({ filters, sources, onChange }: LeadsFilterProps) {
  const hasFilters = filters.source !== "" || filters.dateFrom !== "" || filters.dateTo !== "";

  function clear() {
    onChange({ source: "", dateFrom: "", dateTo: "" });
  }

  return (
    /* Left padding matches the header indent (56px) */
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 40px 16px 80px",
      flexWrap: "wrap",
    }}>
      {/* Compact yellow Source pill — matches Figma's 81×26px pill */}
      <div style={{ position: "relative" }}>
        <select
          value={filters.source}
          onChange={(e) => onChange({ ...filters, source: e.target.value })}
          style={{
            appearance: "none",
            cursor: "pointer",
            padding: "3px 12px",
            borderRadius: 6,
            border: "none",
            background: "#FFB700",
            color: "#252222",
            fontFamily: "'Satoshi', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          <option value="">Source</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          style={{
            height: 30,
            padding: "0 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid #e0e0e0",
            color: filters.dateFrom ? "#252222" : "rgba(37,34,34,0.4)",
            background: "#ffffff",
            fontFamily: "'Satoshi', sans-serif",
          }}
        />
        <span style={{ color: "rgba(37,34,34,0.4)", fontSize: 12, fontFamily: "'Satoshi', sans-serif" }}>to</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          style={{
            height: 30,
            padding: "0 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid #e0e0e0",
            color: filters.dateTo ? "#252222" : "rgba(37,34,34,0.4)",
            background: "#ffffff",
            fontFamily: "'Satoshi', sans-serif",
          }}
        />
      </div>

      {hasFilters && (
        <button
          onClick={clear}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            height: 30,
            padding: "0 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "rgba(37,34,34,0.6)",
            fontFamily: "'Satoshi', sans-serif",
            cursor: "pointer",
          }}
        >
          <X size={11} />
          Clear
        </button>
      )}
    </div>
  );
}
