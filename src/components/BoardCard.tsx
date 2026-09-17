import { InitialsAvatar, PriorityBadge, StepNumber } from "@/components/ui-bits";
import { formatDueLabel } from "@/lib/dates";
import { agingDays, isOverdue } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Person, Task } from "@/types";

/** The bottom-right figure differs per status column — see the plan's
 * Board section for why each column shows what it shows. */
function BottomRightFigure({ task, blockerTitle }: { task: Task; blockerTitle: string | null }) {
  const overdue = isOverdue(task);
  switch (task.status) {
    case "not_started":
      return <span className="text-[11px] text-muted-foreground">{formatDueLabel(task)}</span>;
    case "in_progress":
      return (
        <span className={cn("text-[11px]", overdue ? "font-semibold text-destructive" : "text-muted-foreground")}>
          {formatDueLabel(task)}
        </span>
      );
    case "blocked": {
      const days = agingDays(task);
      const waitingOn = blockerTitle ?? task.blockedOn?.reason ?? "unspecified";
      return (
        <span className="truncate text-[11px] text-status-blocked" title={`Waiting on: ${waitingOn}`}>
          Waiting on {waitingOn} · {days}d
        </span>
      );
    }
    case "in_review": {
      const days = agingDays(task);
      return <span className="text-[11px] text-status-in-review">{days}d waiting</span>;
    }
    case "done":
      return null;
    default:
      return null;
  }
}

export function BoardCard({
  task,
  step,
  assignee,
  blockerTitle,
  onOpen,
}: {
  task: Task;
  step: number;
  assignee: Person | null;
  blockerTitle: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-left shadow-sm hover:border-primary/40"
    >
      <div className="flex items-center justify-between">
        <StepNumber n={step} />
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</div>
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <InitialsAvatar person={assignee} size={20} />
        <BottomRightFigure task={task} blockerTitle={blockerTitle} />
      </div>
    </button>
  );
}

export function DoneCardStack({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) {
    return <div className="px-2 py-6 text-center text-xs text-muted-foreground">No tasks done yet.</div>;
  }
  const onTime = tasks.filter((t) => t.completedAt && t.dueDate && t.completedAt <= t.dueDate).length;
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border p-4 text-center">
      <span className="font-display text-2xl font-semibold text-status-done">{tasks.length}</span>
      <span className="text-xs text-muted-foreground">
        done · {onTime}/{tasks.filter((t) => t.dueDate).length || 0} on time
      </span>
    </div>
  );
}
