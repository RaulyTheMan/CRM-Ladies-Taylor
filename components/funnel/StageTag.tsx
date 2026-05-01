import { FunnelStage, STAGE_META } from "@/lib/types";

export function StageTag({ stage }: { stage: FunnelStage }) {
  const meta = STAGE_META[stage];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium"
      style={{ background: meta.bg, color: meta.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: meta.dot }}
      />
      {stage}
    </span>
  );
}
