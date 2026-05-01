"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lead, SortState, FilterState, FunnelStage } from "@/lib/types";
import { getLeadStage } from "@/lib/funnel-store";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { cacheLeads, getCachedLeads } from "@/lib/lead-cache";
import { moveToJunk } from "@/lib/junk-store";
import { LeadStatus, LEAD_STATUSES, STATUS_META, getAllStatuses, setLeadStatus } from "@/lib/status-store";
import { COLUMNS } from "@/components/leads/LeadsTable";
import {
  RefreshCw, AlertCircle, Search, SlidersHorizontal,
  ArrowUpDown, Settings2, X, Plus, Check, Trash2, ChevronLeft, ChevronRight, ChevronDown
} from "lucide-react";

type LoadState = "idle" | "loading" | "error";

const PAGE_SIZE = 50;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SORT_OPTIONS = [
  { label: "Date (newest)", column: "Submitted At", direction: "desc" as const },
  { label: "Date (oldest)", column: "Submitted At", direction: "asc" as const },
  { label: "Name A→Z",      column: "Name",         direction: "asc" as const },
  { label: "Name Z→A",      column: "Name",         direction: "desc" as const },
  { label: "Company A→Z",   column: "Company",      direction: "asc" as const },
  { label: "Source A→Z",    column: "Source",       direction: "asc" as const },
];

function sortLeads(leads: Lead[], sort: SortState): Lead[] {
  return [...leads].sort((a, b) => {
    const av = a[sort.column] ?? "";
    const bv = b[sort.column] ?? "";
    const cmp = av.localeCompare(bv, undefined, { numeric: true });
    return sort.direction === "asc" ? cmp : -cmp;
  });
}

function filterLeads(leads: Lead[], filters: FilterState, search: string): Lead[] {
  const q = search.toLowerCase().trim();
  return leads.filter((lead) => {
    if (filters.source && lead.Source !== filters.source) return false;
    if (filters.dateFrom) {
      const d = new Date(lead["Submitted At"]);
      if (isNaN(d.getTime()) || d < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      const d = new Date(lead["Submitted At"]);
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      if (isNaN(d.getTime()) || d > end) return false;
    }
    if (q) {
      const haystack = [lead.Name, lead.Company, lead.Email, lead.Phone, lead.Source]
        .join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function uid() {
  return "manual_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [sort, setSort] = useState<SortState>({ column: "Submitted At", direction: "desc" });
  const [filters, setFilters] = useState<FilterState>({ source: "", dateFrom: "", dateTo: "" });
  const [search, setSearch] = useState("");
  const [stages, setStages] = useState<Record<string, FunnelStage>>({});
  const [page, setPage] = useState(0);

  // Statuses
  const [statuses, setStatuses] = useState<Record<string, LeadStatus>>({});

  useEffect(() => {
    setStatuses(getAllStatuses());
  }, []);

  function handleStatusChange(id: string, status: LeadStatus) {
    setLeadStatus(id, status);
    setStatuses((prev) => ({ ...prev, [id]: status }));
  }

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmJunk, setConfirmJunk] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    if (pagedLeads.every((l) => selectedIds.has(l._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedLeads.map((l) => l._id)));
    }
  }

  function handleMoveToJunk() {
    const toJunk = leads.filter((l) => selectedIds.has(l._id));
    moveToJunk(toJunk);
    const updated = leads.filter((l) => !selectedIds.has(l._id));
    setLeads(updated);
    cacheLeads(updated);
    setSelectedIds(new Set());
    setConfirmJunk(false);
  }

  function handleBulkStatus(status: LeadStatus) {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => setLeadStatus(id, status));
    setStatuses((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = status; });
      return next;
    });
    setSelectedIds(new Set());
    setBulkStatusOpen(false);
  }

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(COLUMNS.map(c => c.key))
  );

  function toggleColumn(key: string) {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // Toolbar toggles
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewPanel, setShowNewPanel] = useState(false);

  // New lead form
  const [newLead, setNewLead] = useState({ Name: "", Company: "", Phone: "", Email: "", Source: "", Industry: "", Campaign: "", Message: "" });
  const [newSaved, setNewSaved] = useState(false);
  const [newErrors, setNewErrors] = useState<{ email?: string; name?: string }>({});

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchLeads = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      const fetched = data.leads ?? [];
      const cached = getCachedLeads().filter((l) => l._id.startsWith("manual_"));
      const all = [...cached, ...fetched];
      setLeads(all);
      cacheLeads(all);
      setLoadState("idle");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (leads.length === 0) return;
    const map: Record<string, FunnelStage> = {};
    leads.forEach((l) => { map[l._id] = getLeadStage(l._id); });
    setStages(map);
  }, [leads]);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filters, search, sort]);

  function handleSort(column: string) {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );
  }

  function handleSaveNewLead() {
    const errors: { email?: string; name?: string } = {};

    if (!newLead.Name.trim()) {
      errors.name = "Name is required";
    }
    if (newLead.Email.trim() && !EMAIL_RE.test(newLead.Email.trim())) {
      errors.email = "Invalid email address";
    }
    if (newLead.Email.trim() && EMAIL_RE.test(newLead.Email.trim())) {
      const dup = leads.some((l) => l.Email.toLowerCase() === newLead.Email.toLowerCase().trim());
      if (dup) errors.email = "A lead with this email already exists";
    }

    if (Object.keys(errors).length > 0) {
      setNewErrors(errors);
      return;
    }

    const lead: Lead = {
      _id: uid(),
      Name: newLead.Name.trim(),
      Company: newLead.Company,
      Phone: newLead.Phone,
      Email: newLead.Email.trim(),
      Source: newLead.Source,
      Industry: newLead.Industry,
      Campaign: newLead.Campaign,
      Message: newLead.Message,
      "Submitted At": new Date().toISOString(),
    };
    const updated = [lead, ...leads];
    setLeads(updated);
    cacheLeads(updated);
    setNewErrors({});
    setNewSaved(true);
    setTimeout(() => {
      setShowNewPanel(false);
      setNewLead({ Name: "", Company: "", Phone: "", Email: "", Source: "", Industry: "", Campaign: "", Message: "" });
      setNewSaved(false);
    }, 800);
  }

  const sources = useMemo(
    () => [...new Set(leads.map((l) => l.Source).filter(Boolean))].sort(),
    [leads]
  );

  const filteredSortedLeads = useMemo(
    () => sortLeads(filterLeads(leads, filters, search), sort),
    [leads, filters, search, sort]
  );

  const totalPages = Math.ceil(filteredSortedLeads.length / PAGE_SIZE);
  const pagedLeads = useMemo(
    () => filteredSortedLeads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredSortedLeads, page]
  );

  const hasFilters = filters.source || filters.dateFrom || filters.dateTo || search;
  const activeSortLabel = SORT_OPTIONS.find(o => o.column === sort.column && o.direction === sort.direction)?.label ?? "Sort";

  return (
    <div className="flex flex-col h-full" style={{ position: "relative" }}>
      {/* Header */}
      <header style={{ padding: "176px 40px 16px 80px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{
            color: "#252222", fontFamily: "'Satoshi', sans-serif",
            fontSize: 48, fontWeight: 700, lineHeight: 0.95,
            letterSpacing: "-0.02em", whiteSpace: "nowrap",
          }}>
            People &amp; Leads
          </h1>
          {loadState === "idle" && leads.length > 0 && (
            <span style={{ color: "rgba(37,34,34,0.40)", fontFamily: "'Satoshi', sans-serif", fontSize: 20, fontWeight: 500 }}>
              {filteredSortedLeads.length}{filteredSortedLeads.length !== leads.length ? ` of ${leads.length}` : ""}
            </span>
          )}

          {/* Toolbar */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>

            {/* Refresh */}
            <ToolBtn onClick={fetchLeads} title="Refresh" active={false}>
              <RefreshCw size={14} strokeWidth={2} className={loadState === "loading" ? "animate-spin" : ""} />
            </ToolBtn>

            {/* Search */}
            <ToolBtn onClick={() => { setShowSearch(s => !s); setShowFilter(false); setShowSort(false); setShowSettings(false); }} title="Search" active={showSearch || !!search}>
              <Search size={14} strokeWidth={2} />
            </ToolBtn>

            {/* Filter */}
            <ToolBtn onClick={() => { setShowFilter(s => !s); setShowSearch(false); setShowSort(false); setShowSettings(false); }} title="Filter" active={showFilter || !!(filters.source || filters.dateFrom || filters.dateTo)}>
              <SlidersHorizontal size={14} strokeWidth={2} />
            </ToolBtn>

            {/* Sort */}
            <div style={{ position: "relative" }}>
              <ToolBtn onClick={() => { setShowSort(s => !s); setShowSearch(false); setShowFilter(false); setShowSettings(false); }} title="Sort" active={showSort}>
                <ArrowUpDown size={14} strokeWidth={2} />
              </ToolBtn>
              {showSort && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.10)", zIndex: 50, minWidth: 180,
                  padding: "6px 0", fontFamily: "'Satoshi', sans-serif",
                }}>
                  {SORT_OPTIONS.map((o) => {
                    const active = sort.column === o.column && sort.direction === o.direction;
                    return (
                      <button key={o.label} onClick={() => { setSort({ column: o.column, direction: o.direction }); setShowSort(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", padding: "8px 14px", border: "none",
                          background: active ? "rgba(255,183,0,0.10)" : "transparent",
                          color: active ? "#252222" : "rgba(37,34,34,0.65)",
                          fontSize: 13, cursor: "pointer", textAlign: "left",
                          fontFamily: "'Satoshi', sans-serif", fontWeight: active ? 600 : 400,
                        }}>
                        {active && <Check size={11} strokeWidth={2.5} color="#FFB700" />}
                        {!active && <span style={{ width: 11 }} />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Settings / Column visibility */}
            <div style={{ position: "relative" }}>
              <ToolBtn onClick={() => { setShowSettings(s => !s); setShowSearch(false); setShowFilter(false); setShowSort(false); }} title="Settings" active={showSettings}>
                <Settings2 size={14} strokeWidth={2} />
              </ToolBtn>
              {showSettings && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.10)", zIndex: 50, minWidth: 180,
                  padding: "10px 14px", fontFamily: "'Satoshi', sans-serif",
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(37,34,34,0.4)", letterSpacing: "0.07em", marginBottom: 8 }}>COLUMNS</p>
                  {COLUMNS.map((col) => {
                    const visible = visibleColumns.has(col.key);
                    return (
                      <div
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: "#252222", cursor: "pointer", userSelect: "none" }}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: 3,
                          background: visible ? "#FFB700" : "transparent",
                          border: visible ? "none" : "1.5px solid #d0d0d0",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          {visible && <Check size={9} strokeWidth={3} color="#fff" />}
                        </div>
                        {col.label.charAt(0) + col.label.slice(1).toLowerCase()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: "#e0e0e0", margin: "0 4px" }} />

            {/* New button */}
            <button
              onClick={() => { setShowNewPanel(true); setShowSearch(false); setShowFilter(false); setShowSort(false); setShowSettings(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 14px", height: 34, borderRadius: 8,
                background: "#3b82f6", color: "#fff", border: "none",
                cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              New
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, maxWidth: 400 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1.5px solid #FFB700", borderRadius: 8, padding: "0 12px", height: 36, background: "#fff" }}>
              <Search size={13} strokeWidth={2} style={{ color: "rgba(37,34,34,0.4)", flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, company, email…"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "'Satoshi', sans-serif", color: "#252222", background: "transparent" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                  <X size={12} style={{ color: "rgba(37,34,34,0.4)" }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter panel */}
        {showFilter && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              style={{
                appearance: "none", cursor: "pointer", padding: "5px 14px",
                borderRadius: 8, border: "1.5px solid #e0e0e0",
                background: filters.source ? "#FFB700" : "#fff",
                color: filters.source ? "#252222" : "rgba(37,34,34,0.55)",
                fontFamily: "'Satoshi', sans-serif", fontSize: 13, fontWeight: 600,
              }}
            >
              <option value="">All Sources</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 8, border: "1.5px solid #e0e0e0", fontFamily: "'Satoshi', sans-serif", color: "#252222" }} />
            <span style={{ color: "rgba(37,34,34,0.4)", fontSize: 12 }}>to</span>
            <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 8, border: "1.5px solid #e0e0e0", fontFamily: "'Satoshi', sans-serif", color: "#252222" }} />
            {(filters.source || filters.dateFrom || filters.dateTo) && (
              <button onClick={() => setFilters({ source: "", dateFrom: "", dateTo: "" })}
                style={{ display: "flex", alignItems: "center", gap: 4, height: 34, padding: "0 10px", fontSize: 12, borderRadius: 8, border: "none", background: "transparent", color: "rgba(37,34,34,0.5)", cursor: "pointer", fontFamily: "'Satoshi', sans-serif" }}>
                <X size={11} /> Clear
              </button>
            )}
          </div>
        )}
      </header>

      {loadState === "error" && (
        <div className="flex items-center gap-2.5 mx-5 mt-2 px-4 py-3 rounded-md text-[13px]"
          style={{ background: "oklch(97% 0.01 15)", color: "oklch(40% 0.12 15)", marginLeft: 80 }}>
          <AlertCircle size={14} strokeWidth={1.75} />
          <span>Couldn't load leads. Check your connection or Sheet permissions.</span>
          <button onClick={fetchLeads} className="ml-auto text-[12px] underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {loadState === "loading" && leads.length === 0 ? (
          <SkeletonRows />
        ) : (
          <LeadsTable
            leads={pagedLeads}
            sort={sort}
            selectedId={null}
            selectedIds={selectedIds}
            statuses={statuses}
            visibleColumns={visibleColumns}
            onSort={handleSort}
            onSelect={(lead) => !selectedIds.size && router.push(`/deals/${lead._id}`)}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 0", borderTop: "1px solid #f0f0f0", flexShrink: 0,
          fontFamily: "'Satoshi', sans-serif",
        }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              display: "flex", alignItems: "center", padding: "4px 8px", borderRadius: 6,
              border: "1px solid #e0e0e0", background: "#fff", cursor: page === 0 ? "default" : "pointer",
              color: page === 0 ? "rgba(37,34,34,0.25)" : "#252222",
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 13, color: "rgba(37,34,34,0.55)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              display: "flex", alignItems: "center", padding: "4px 8px", borderRadius: 6,
              border: "1px solid #e0e0e0", background: "#fff", cursor: page >= totalPages - 1 ? "default" : "pointer",
              color: page >= totalPages - 1 ? "rgba(37,34,34,0.25)" : "#252222",
            }}
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
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

          {/* Bulk status change */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setBulkStatusOpen((o) => !o); setConfirmJunk(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.1)", border: "none",
                color: "rgba(255,255,255,0.85)", borderRadius: 8, padding: "6px 12px",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
              }}
            >
              Set Status
              <ChevronDown size={11} strokeWidth={2.5} style={{ opacity: 0.6 }} />
            </button>
            {bulkStatusOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 300, minWidth: 190,
                padding: "6px 0",
              }}>
                {LEAD_STATUSES.map((s) => {
                  const m = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleBulkStatus(s)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "7px 14px", border: "none",
                        background: "transparent", cursor: "pointer",
                        fontFamily: "'Satoshi', sans-serif", fontSize: 13,
                        color: "#252222", textAlign: "left",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Move to Junk */}
          {confirmJunk ? (
            <>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                Move {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} to Junk?
              </span>
              <button
                onClick={handleMoveToJunk}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "#ef4444", border: "none",
                  color: "#fff", borderRadius: 8, padding: "6px 12px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                }}
              >
                <Check size={12} strokeWidth={2.5} /> Confirm
              </button>
              <button
                onClick={() => setConfirmJunk(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setConfirmJunk(true); setBulkStatusOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(239,68,68,0.15)", border: "none",
                  color: "#f87171", borderRadius: 8, padding: "6px 12px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Satoshi', sans-serif",
                }}
              >
                <Trash2 size={13} strokeWidth={2} />
                Move to Junk
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Click-outside overlay for dropdowns */}
      {(showSort || showSettings || bulkStatusOpen) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }}
          onClick={() => { setShowSort(false); setShowSettings(false); setBulkStatusOpen(false); }} />
      )}

      {/* New Lead slide-in panel */}
      {showNewPanel && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 100 }}
            onClick={() => { setShowNewPanel(false); setNewErrors({}); }} />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
            background: "#fff", zIndex: 101, display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#252222", fontFamily: "'Satoshi', sans-serif", margin: 0 }}>New Lead</p>
              <button onClick={() => { setShowNewPanel(false); setNewErrors({}); }}
                style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "rgba(37,34,34,0.4)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {([
                { key: "Name", label: "Name *", placeholder: "Full name" },
                { key: "Company", label: "Company", placeholder: "Company name" },
                { key: "Phone", label: "Phone", placeholder: "+91 98000 00000" },
                { key: "Email", label: "Email", placeholder: "name@example.com" },
                { key: "Industry", label: "Industry", placeholder: "e.g. Fashion, Tech" },
                { key: "Campaign", label: "Campaign", placeholder: "e.g. Meta Ads April" },
                { key: "Message", label: "Requirement", placeholder: "What are they looking for?" },
              ] as { key: keyof typeof newLead; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => {
                const error = key === "Name" ? newErrors.name : key === "Email" ? newErrors.email : undefined;
                return (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: error ? "#dc2626" : "rgba(37,34,34,0.5)", fontFamily: "'Satoshi', sans-serif", letterSpacing: "0.04em" }}>
                      {label.toUpperCase()}
                    </label>
                    {key === "Message" ? (
                      <textarea
                        value={newLead[key]}
                        onChange={(e) => { setNewLead(p => ({ ...p, [key]: e.target.value })); setNewErrors({}); }}
                        placeholder={placeholder}
                        rows={3}
                        style={{ padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${error ? "#ef4444" : "#e0e0e0"}`, fontSize: 13.5, fontFamily: "'Satoshi', sans-serif", outline: "none", resize: "vertical", color: "#252222" }}
                      />
                    ) : (
                      <input
                        value={newLead[key]}
                        onChange={(e) => { setNewLead(p => ({ ...p, [key]: e.target.value })); setNewErrors({}); }}
                        placeholder={placeholder}
                        style={{ padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${error ? "#ef4444" : "#e0e0e0"}`, fontSize: 13.5, fontFamily: "'Satoshi', sans-serif", outline: "none", color: "#252222" }}
                      />
                    )}
                    {error && <span style={{ fontSize: 11.5, color: "#dc2626", fontFamily: "'Satoshi', sans-serif" }}>{error}</span>}
                  </div>
                );
              })}

              {/* Source select */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(37,34,34,0.5)", fontFamily: "'Satoshi', sans-serif", letterSpacing: "0.04em" }}>SOURCE</label>
                <select
                  value={newLead.Source}
                  onChange={(e) => setNewLead(p => ({ ...p, Source: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 13.5, fontFamily: "'Satoshi', sans-serif", outline: "none", color: "#252222", background: "#fff" }}
                >
                  <option value="">Select source…</option>
                  {sources.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="Manual">Manual</option>
                </select>
              </div>
            </div>

            {/* Save button */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f0f0" }}>
              <button
                onClick={handleSaveNewLead}
                style={{
                  width: "100%", height: 42, borderRadius: 10, border: "none",
                  background: newSaved ? "#22c55e" : "#3b82f6",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Satoshi', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.2s",
                }}
              >
                {newSaved ? <><Check size={15} strokeWidth={2.5} /> Saved!</> : "Save Lead"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToolBtn({ onClick, title, active, children }: { onClick: () => void; title: string; active: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 8,
        border: active ? "1.5px solid #FFB700" : "1px solid #e0e0e0",
        background: active ? "rgba(255,183,0,0.08)" : "#fff",
        color: active ? "#b07d00" : "rgba(37,34,34,0.55)",
        cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="flex-1 overflow-hidden px-4 pt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--color-line-faint)" }}>
          {[200, 220, 150, 120, 160].map((w) => (
            <div key={w} className="h-3.5 rounded animate-pulse"
              style={{ width: w, background: "var(--color-line-faint)", opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
