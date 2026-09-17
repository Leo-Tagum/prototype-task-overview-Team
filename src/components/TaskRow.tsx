import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InitialsAvatar, OverdueRing, PriorityBadge, StatusBadge, StepNumber } from "@/components/ui-bits";
import { InsertAfterMenu } from "@/components/InsertAfterMenu";
import { PRIORITY_META, STATUS_META, STATUS_ORDER } from "@/types";
import type { Person, Priority, Status, Task } from "@/types";
import { formatDueLabel } from "@/lib/dates";
import { isOverdue } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export function TaskRow({
  task,
  step,
  roster,
  orderedSiblings,
  onOpen,
  onUpdate,
  onInsertAfter,
}: {
  task: Task;
  step: number;
  roster: Person[];
  orderedSiblings: Task[];
  onOpen: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onInsertAfter: (afterTaskId: string | null) => void;
}) {
  const assignee = roster.find((p) => p.id === task.assigneeId) ?? null;
  const overdue = isOverdue(task);

  return (
    <div className="group flex items-center gap-3 border-b border-border px-3 py-2 hover:bg-accent/40">
      <StepNumber n={step} className="w-8 shrink-0" />

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline">
        {task.title}
      </button>

      {overdue && <OverdueRing />}

      <Select value={String(task.priority)} onValueChange={(v) => onUpdate({ priority: Number(v) as Priority })}>
        <SelectTrigger className="h-7 w-[128px] shrink-0 border-none bg-transparent px-1 text-xs shadow-none">
          <SelectValue>
            <PriorityBadge priority={task.priority} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {([5, 4, 3, 2, 1] as Priority[]).map((p) => (
            <SelectItem key={p} value={String(p)}>
              P{p} {PRIORITY_META[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={task.status} onValueChange={(v) => onUpdate({ status: v as Status })}>
        <SelectTrigger className="h-7 w-[128px] shrink-0 border-none bg-transparent px-1 text-xs shadow-none">
          <SelectValue>
            <StatusBadge status={task.status} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={task.assigneeId ?? "unassigned"} onValueChange={(v) => onUpdate({ assigneeId: v === "unassigned" ? null : v })}>
        <SelectTrigger className="h-7 w-[40px] shrink-0 border-none bg-transparent px-0 shadow-none [&>svg]:hidden">
          <SelectValue>
            <InitialsAvatar person={assignee} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {roster.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className={cn("w-24 shrink-0 text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
        {formatDueLabel(task)}
      </span>

      <div className="opacity-0 group-hover:opacity-100">
        <InsertAfterMenu task={task} orderedSiblings={orderedSiblings} onInsertAfter={onInsertAfter} />
      </div>
    </div>
  );
}
