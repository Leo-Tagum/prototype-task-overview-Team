import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InitialsAvatar, statusDotClass } from "@/components/ui-bits";
import { STATUS_META } from "@/types";
import type { Person, Status, Task } from "@/types";
import { openLoadByStatus, openLoadPoints } from "@/lib/metrics";

const BAR_STATUSES: Status[] = ["not_started", "in_progress", "blocked", "in_review"];

function WorkloadBar({
  label,
  person,
  points,
  segments,
  capacity,
  scale,
}: {
  label: string;
  person: Person | null;
  points: number;
  segments: Record<Status, number>;
  capacity: number | null;
  scale: number;
}) {
  const capacityPct = capacity ? Math.min(100, (capacity / scale) * 100) : null;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex w-32 shrink-0 items-center gap-2">
        <InitialsAvatar person={person} size={20} />
        <span className="truncate text-sm">{label}</span>
      </div>
      <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted">
        <div className="flex h-full">
          {BAR_STATUSES.map((s) => {
            const widthPct = (segments[s] / scale) * 100;
            if (widthPct <= 0) return null;
            return <div key={s} className={statusDotClass(s)} style={{ width: `${widthPct}%` }} title={`${STATUS_META[s].label}: ${segments[s]}pt`} />;
          })}
        </div>
        {capacityPct !== null && (
          <div
            className="absolute inset-y-0 border-l-2 border-dashed border-foreground/50"
            style={{ left: `${capacityPct}%` }}
            title={`Capacity: ${capacity}pt`}
          />
        )}
      </div>
      <span className="w-14 shrink-0 text-right font-mono-data text-xs text-muted-foreground">{points}pt</span>
    </div>
  );
}

export function WorkloadPanel({
  tasks,
  roster,
  onChangeCapacity,
}: {
  tasks: Task[];
  roster: Person[];
  onChangeCapacity: (personId: string, capacityPoints: number) => void;
}) {
  const active = roster.filter((p) => p.active);
  const unassignedPoints = openLoadPoints(tasks, null);
  const maxLoad = Math.max(
    unassignedPoints,
    ...active.map((p) => openLoadPoints(tasks, p.id)),
    ...active.map((p) => p.capacityPoints),
    1,
  );
  const scale = maxLoad * 1.1;

  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">Workload</h2>
        <span className="text-xs text-muted-foreground">Points, not task count — S=1 · M=3 · L=5</span>
      </div>

      {/* People listed in fixed roster order — sorting by load would turn a planning tool into a ranking. */}
      {active.map((p) => (
        <div key={p.id} className="group flex items-center gap-2">
          <div className="flex-1">
            <WorkloadBar
              label={p.name}
              person={p}
              points={openLoadPoints(tasks, p.id)}
              segments={openLoadByStatus(tasks, p.id)}
              capacity={p.capacityPoints}
              scale={scale}
            />
          </div>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onChangeCapacity(p.id, Math.max(1, p.capacityPoints - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onChangeCapacity(p.id, p.capacityPoints + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      <div className="mt-1 border-t border-dashed border-border pt-2">
        <WorkloadBar
          label="Unassigned"
          person={null}
          points={unassignedPoints}
          segments={openLoadByStatus(tasks, null)}
          capacity={null}
          scale={scale}
        />
      </div>
    </div>
  );
}
