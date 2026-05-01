"use client";

import { useEffect, useState } from "react";
import { TrashedLead, getTrashedLeads, restoreFromTrash, permanentlyDelete, clearTrash } from "@/lib/trash-store";
import { cacheLeads, getCachedLeads } from "@/lib/lead-cache";
import { deleteDeals } from "@/lib/deal-store";
import { Check, RotateCcw, Trash2, X, AlertTriangle } from "lucide-react";

export default function TrashPage() {
  const [items, setItems] = useState<TrashedLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setItems(getTrashedLeads());
  }, []);

  function refresh() {
    setItems(getTrashedLeads());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (items.every((l) => selectedIds.has(l._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((l) => l._id)));
    }
  }

  function handleRestore() {
    const restored = restoreFromTrash(Array.from(selectedIds));
    const cached = getCachedLeads();
    const existingIds = new Set(cached.map((l) => l._id));
    const toAdd = restored.filter((l) => !existingIds.has(l._id)).map(({ _trashedAt, ...lead }) => lead);
    cacheLeads([...cached, ...toAdd]);
    setSelectedIds(new Set());
    refresh();
  }

  function handleDelete() {
    const ids = Array.from(selectedIds);
    permanentlyDelete(ids);
    deleteDeals(ids);
    setSelectedIds(new Set());
    setConfirmDeleteOpen(false);
    refresh();
  }

  function handleEmptyTrash() {
    const allIds = items.map((l) => l._id);
    clearTrash();
    deleteDeals(allIds);
    setSelectedIds(new Set());
    setConfirmEmptyOpen(false);
    refresh();
  }

  const anySelected = selectedIds.size > 0;
  const allSelected = items.length > 0 && items.every((l) => selectedIds.has(l._id));

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      <header style={{ padding: "176px 40px 16px 80px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-trash.svg" alt="" style={{ width: 36, height: 36, opacity: 0.35 }} />
            <h1 style={{
              color: "#252222", fontSize: 48, fontWeight: 700,
              lineHeight: 0.95, letterSpacing: "-0.02em", margin: 0,
            }}>
              Trash
            </h1>
          </div>
          {items.length > 0 && (
            <span style={{ color: "rgba(37,34,34,0.40)", fontSize: 20, fontWeight: 500 }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          )}
          {items.length > 0 && (
            <button
              onClick={() => setConfirmEmptyOpen(true)}
              style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                height: 34, padding: "0 14px", borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)",
                color: "#ef4444", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >
              <Trash2 size={12} strokeWidth={2} />
              Empty Trash
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-trash.svg" alt="" style={{ width: 48, height: 48, opacity: 0.15 }} />
          <p style={{ fontSize: 15, color: "rgba(37,34,34,0.35)", margin: 0 }}>Trash is empty</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", paddingLeft: 80, paddingRight: 40 }}>
          <table style={{ width: "100%", minWidth: 800, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: 32, paddingRight: 12, paddingBottom: 12, textAlign: "left", borderBottom: "1.5px solid #d9d9d9" }}>
                  <CheckBox checked={allSelected} visible={anySelected} indeterminate={anySelected && !allSelected} onChange={toggleAll} />
                </th>
                {["NAME", "COMPANY", "EMAIL", "SOURCE", "TRASHED"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "0 20px 12px 0",
                    fontSize: 12, fontWeight: 700, letterSpacing: "0.07em",
                    color: "rgba(37,34,34,0.45)", borderBottom: "1.5px solid #d9d9d9",
                    whiteSpace: "nowrap", fontFamily: "'Satoshi', sans-serif",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => {
                const selected = selectedIds.has(lead._id);
                const hovered = hoveredId === lead._id;
                const showCheck = selected || hovered || anySelected;
                return (
                  <tr
                    key={lead._id}
                    style={{ background: selected ? "rgba(239,68,68,0.06)" : "transparent", cursor: "default" }}
                    onMouseEnter={(e) => {
                      setHoveredId(lead._id);
                      if (!selected) (e.currentTarget as HTMLElement).style.background = "rgba(37,34,34,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      setHoveredId(null);
                      if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid #f0f0f0", width: 32 }}
                      onClick={() => toggleSelect(lead._id)}>
                      <CheckBox checked={selected} visible={showCheck} onChange={() => toggleSelect(lead._id)} />
                    </td>
                    <td style={{ padding: "14px 20px 14px 0", borderBottom: "1px solid #f0f0f0", fontSize: 15, fontWeight: 500, color: "rgba(37,34,34,0.5)" }}>{lead.Name || "—"}</td>
                    <td style={{ padding: "14px 20px 14px 0", borderBottom: "1px solid #f0f0f0", fontSize: 15, color: "rgba(37,34,34,0.5)" }}>{lead.Company || "—"}</td>
                    <td style={{ padding: "14px 20px 14px 0", borderBottom: "1px solid #f0f0f0", fontSize: 15, color: "rgba(37,34,34,0.5)" }}>{lead.Email || "—"}</td>
                    <td style={{ padding: "14px 20px 14px 0", borderBottom: "1px solid #f0f0f0", fontSize: 15, color: "rgba(37,34,34,0.5)" }}>{lead.Source || "—"}</td>
                    <td style={{ padding: "14px 20px 14px 0", borderBottom: "1px solid #f0f0f0", fontSize: 12, color: "rgba(37,34,34,0.35)" }}>
                      {lead._trashedAt ? new Date(lead._trashedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selection action bar */}
      {anySelected && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 12,
          background: "#252222", borderRadius: 12, padding: "10px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)", zIndex: 200,
          fontFamily: "'Satoshi', sans-serif",
        }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={handleRestore} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(34,197,94,0.15)", border: "none",
            color: "#4ade80", borderRadius: 8, padding: "6px 12px",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
          }}>
            <RotateCcw size={13} strokeWidth={2} />
            Restore
          </button>

          {confirmDeleteOpen ? (
            <>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                Delete {selectedIds.size} forever?
              </span>
              <button onClick={handleDelete} style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "#ef4444", border: "none",
                color: "#fff", borderRadius: 8, padding: "6px 12px",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
              }}>
                <Check size={12} strokeWidth={2.5} /> Confirm
              </button>
              <button onClick={() => setConfirmDeleteOpen(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center",
              }}>
                <X size={13} />
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDeleteOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(239,68,68,0.15)", border: "none",
              color: "#f87171", borderRadius: 8, padding: "6px 12px",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
            }}>
              <Trash2 size={13} strokeWidth={2} />
              Delete Forever
            </button>
          )}

          {!confirmDeleteOpen && (
            <button onClick={() => setSelectedIds(new Set())} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Empty Trash confirmation modal */}
      {confirmEmptyOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300 }}
            onClick={() => setConfirmEmptyOpen(false)}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "#fff", borderRadius: 14, padding: "28px 32px", zIndex: 301,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18)", maxWidth: 380, width: "90%",
            fontFamily: "'Satoshi', sans-serif",
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <AlertTriangle size={20} strokeWidth={1.75} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#252222", margin: "0 0 6px" }}>Empty Trash?</p>
                <p style={{ fontSize: 13, color: "rgba(37,34,34,0.55)", margin: 0, lineHeight: 1.5 }}>
                  All {items.length} item{items.length !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmEmptyOpen(false)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #e0e0e0",
                  background: "#fff", color: "#252222", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                }}
              >
                Delete All
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CheckBox({ checked, indeterminate, visible, onChange }: {
  checked: boolean; indeterminate?: boolean; visible: boolean; onChange: () => void;
}) {
  return (
    <div onClick={(e) => { e.stopPropagation(); onChange(); }} style={{
      width: 16, height: 16, borderRadius: 4,
      border: checked || indeterminate ? "none" : "1.5px solid #d0d0d0",
      background: checked || indeterminate ? "#FFB700" : "#fff",
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
