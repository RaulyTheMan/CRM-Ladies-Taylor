import { Lead, FunnelStage } from "@/lib/types";

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

interface FunnelCardProps {
  lead: Lead;
  stage: FunnelStage;
  isDragging?: boolean;
  onClick?: () => void;
}

export function FunnelCard({ lead, isDragging, onClick }: FunnelCardProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-md p-3 border transition-shadow cursor-pointer"
      style={{
        background: "var(--color-canvas)",
        borderColor: isDragging ? "var(--color-accent)" : "var(--color-line)",
        boxShadow: isDragging
          ? "0 8px 24px oklch(0% 0 0 / 0.08)"
          : "0 1px 2px oklch(0% 0 0 / 0.04)",
      }}
    >
      <p
        className="text-[13px] font-medium leading-snug"
        style={{ color: "var(--color-ink)" }}
      >
        {lead.Name || "—"}
      </p>
      <div className="flex items-center justify-between mt-2 gap-2">
        {lead.Source ? (
          <span
            className="text-[11px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--color-accent-dim)",
              color: "var(--color-accent)",
            }}
          >
            {lead.Source}
          </span>
        ) : (
          <span />
        )}
        <span
          className="text-[11px] flex-shrink-0"
          style={{ color: "var(--color-ink-ghost)" }}
        >
          {formatShortDate(lead["Submitted At"])}
        </span>
      </div>
    </div>
  );
}
