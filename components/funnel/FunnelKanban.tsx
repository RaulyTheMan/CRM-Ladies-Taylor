"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Lead, FunnelStage, FUNNEL_ALL_STAGES, STAGE_META } from "@/lib/types";
import { FunnelCard } from "./FunnelCard";
import { cacheLeads } from "@/lib/lead-cache";

interface FunnelKanbanProps {
  leads: Lead[];
  stages: Record<string, FunnelStage>;
  onStageChange: (id: string, stage: FunnelStage) => void;
}

export function FunnelKanban({
  leads,
  stages,
  onStageChange,
}: FunnelKanbanProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (leads.length > 0) cacheLeads(leads);
  }, [leads]);

  function onDragStart() {
    draggingRef.current = true;
  }

  function onDragEnd(result: DropResult) {
    setTimeout(() => { draggingRef.current = false; }, 100);
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId as FunnelStage;
    if (newStage !== stages[leadId]) {
      onStageChange(leadId, newStage);
    }
  }

  const grouped = FUNNEL_ALL_STAGES.reduce<Record<FunnelStage, Lead[]>>(
    (acc, s) => {
      acc[s] = leads.filter((l) => (stages[l._id] ?? "New Deal") === s);
      return acc;
    },
    {} as Record<FunnelStage, Lead[]>
  );

  if (!enabled) {
    return (
      <div className="flex-1 flex overflow-x-auto gap-3 scrollbar-thin" style={{ padding: "0 20px 20px 80px" }}>
        {FUNNEL_ALL_STAGES.map((stage) => (
          <KanbanColumnShell key={stage} stage={stage} count={grouped[stage].length} />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex-1 flex overflow-x-auto gap-3 scrollbar-thin" style={{ padding: "0 20px 20px 80px" }}>
        {FUNNEL_ALL_STAGES.map((stage) => {
          const cards = grouped[stage];
          const meta = STAGE_META[stage];
          return (
            <div key={stage} className="flex flex-col w-[268px] flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: meta.dot }}
                />
                <span
                  className="text-[12.5px] font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {stage}
                </span>
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-full font-medium ml-auto"
                  style={{
                    background: "var(--color-line-faint)",
                    color: "var(--color-ink-ghost)",
                  }}
                >
                  {cards.length}
                </span>
              </div>

              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 flex flex-col gap-2 rounded-lg p-2 min-h-[120px] transition-colors"
                    style={{
                      background: snapshot.isDraggingOver
                        ? "var(--color-accent-dim)"
                        : "var(--color-page)",
                    }}
                  >
                    {cards.length === 0 && !snapshot.isDraggingOver && (
                      <p
                        className="text-[12px] text-center pt-6"
                        style={{ color: "var(--color-ink-ghost)" }}
                      >
                        No leads here yet
                      </p>
                    )}
                    {cards.map((lead, index) => (
                      <Draggable
                        key={lead._id}
                        draggableId={lead._id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <FunnelCard
                              lead={lead}
                              stage={stages[lead._id] ?? "New Deal"}
                              isDragging={snapshot.isDragging}
                              onClick={() => {
                                if (!draggingRef.current) {
                                  router.push(`/deals/${lead._id}`);
                                }
                              }}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

function KanbanColumnShell({
  stage,
  count,
}: {
  stage: FunnelStage;
  count: number;
}) {
  const meta = STAGE_META[stage];
  return (
    <div className="flex flex-col w-[268px] flex-shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: meta.dot }}
        />
        <span
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          {stage}
        </span>
        <span
          className="text-[11px] px-1.5 py-0.5 rounded-full font-medium ml-auto"
          style={{
            background: "var(--color-line-faint)",
            color: "var(--color-ink-ghost)",
          }}
        >
          {count}
        </span>
      </div>
      <div
        className="flex-1 rounded-lg p-2 min-h-[120px]"
        style={{ background: "var(--color-page)" }}
      />
    </div>
  );
}
