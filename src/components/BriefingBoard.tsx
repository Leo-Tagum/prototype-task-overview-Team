import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { InitialsAvatar, PriorityBadge, StatusBadge } from "@/components/ui-bits";
import type { Person, Status, Task } from "@/types";

const ONGOING_STATUSES: Status[] = ["in_progress", "blocked", "in_review"];

function BriefCard({
  task,
  assignee,
  onOpenTask,
  onUpdateBrief,
}: {
  task: Task;
  assignee: Person | null;
  onOpenTask: () => void;
  onUpdateBrief: (brief: string) => void;
}) {
  const [draft, setDraft] = useState(task.brief);
  const [dirty, setDirty] = useState(false);

  // Pick up an external change (e.g. someone else wrote a brief) as long
  // as this viewer hasn't started typing their own.
  useEffect(() => {
    if (!dirty) setDraft(task.brief);
  }, [task.brief, dirty]);

  function commit() {
    if (dirty) onUpdateBrief(draft);
    setDirty(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onOpenTask} className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline">
          {task.title}
        </button>
        <InitialsAvatar person={assignee} size={20} />
      </div>
      <div className="flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        placeholder="What this task is, why it matters, and where it's headed…"
        rows={3}
        className="resize-none text-sm"
      />
    </div>
  );
}

export function BriefingBoard({
  projectId,
  tasks,
  roster,
  onOpenTask,
  onUpdateTask,
}: {
  projectId: string;
  tasks: Task[];
  roster: Person[];
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
}) {
  const ongoing = tasks
    .filter((t) => t.projectId === projectId && ONGOING_STATUSES.includes(t.status))
    .sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <h2 className="font-display text-sm font-semibold">Briefing</h2>
        <p className="text-xs text-muted-foreground">
          Short, plain-language notes on what each ongoing task is, why it matters, and where it's headed — written
          by whoever's working it, for anyone outside the team to read without digging through the board.
        </p>
      </div>

      {ongoing.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing in progress, blocked or in review right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ongoing.map((task) => (
            <BriefCard
              key={task.id}
              task={task}
              assignee={roster.find((p) => p.id === task.assigneeId) ?? null}
              onOpenTask={() => onOpenTask(task.id)}
              onUpdateBrief={(brief) => onUpdateTask(task.id, { brief })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
