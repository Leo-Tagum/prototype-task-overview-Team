import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasteIntake } from "@/components/PasteIntake";
import { BoardCard, DoneCardStack } from "@/components/BoardCard";
import { InitialsAvatar, statusDotClass } from "@/components/ui-bits";
import { STATUS_META, STATUS_ORDER } from "@/types";
import type { Person, Task } from "@/types";
import type { PasteDefaults } from "@/lib/store";
import { isOverdue } from "@/lib/metrics";
import { useChangesSinceLastLook } from "@/lib/lastViewed";

const CARD_TRUNCATE = 6;

type Grouping = "status" | "person";

function ColumnCards({
  tasks,
  allProjectTasks,
  stepOf,
  roster,
  onOpenTask,
}: {
  tasks: Task[];
  allProjectTasks: Task[];
  stepOf: Map<string, number>;
  roster: Person[];
  onOpenTask: (id: string) => void;
}) {
  const shown = tasks.slice(0, CARD_TRUNCATE);
  const rest = tasks.length - shown.length;
  const byId = useMemo(() => new Map(allProjectTasks.map((t) => [t.id, t])), [allProjectTasks]);

  return (
    <div className="flex flex-col gap-2">
      {shown.map((task) => (
        <BoardCard
          key={task.id}
          task={task}
          step={stepOf.get(task.id) ?? 0}
          assignee={roster.find((p) => p.id === task.assigneeId) ?? null}
          blockerTitle={task.blockedOn?.taskId ? byId.get(task.blockedOn.taskId)?.title ?? null : null}
          onOpen={() => onOpenTask(task.id)}
        />
      ))}
      {rest > 0 && <div className="py-1 text-center text-xs text-muted-foreground">+{rest} more</div>}
    </div>
  );
}

export function SummaryBoard({
  projectId,
  tasks,
  roster,
  viewerId,
  onOpenTask,
  onPaste,
}: {
  projectId: string;
  tasks: Task[];
  roster: Person[];
  viewerId: string;
  onOpenTask: (id: string) => void;
  onPaste: (titles: string[], defaults: PasteDefaults) => Promise<void>;
}) {
  const [grouping, setGrouping] = useState<Grouping>("status");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const { count: changeCount, markSeen } = useChangesSinceLastLook(`board:${projectId}`, projectTasks, viewerId);

  const filtered = projectTasks.filter((t) => {
    if (assigneeFilter !== "all" && (t.assigneeId ?? "unassigned") !== assigneeFilter) return false;
    if (overdueOnly && !isOverdue(t)) return false;
    if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const byStepOrder = [...projectTasks].sort((a, b) => a.position - b.position);
  const stepOf = new Map(byStepOrder.map((t, i) => [t.id, i + 1]));

  const lanes: { key: string; label: string; tasks: Task[] }[] =
    grouping === "person"
      ? [
          ...roster
            .filter((p) => p.active)
            .map((p) => ({ key: p.id, label: p.name, tasks: filtered.filter((t) => t.assigneeId === p.id) })),
          { key: "unassigned", label: "Unassigned", tasks: filtered.filter((t) => !t.assigneeId) },
        ]
      : [{ key: "all", label: "All", tasks: filtered }];

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <ToggleGroup type="single" value={grouping} onValueChange={(v) => v && setGrouping(v as Grouping)} size="sm">
          <ToggleGroupItem value="status" className="text-xs">
            By status
          </ToggleGroupItem>
          <ToggleGroupItem value="person" className="text-xs">
            By person
          </ToggleGroupItem>
        </ToggleGroup>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {roster.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={overdueOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setOverdueOnly((v) => !v)}
        >
          Overdue
        </Button>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-8 w-40 text-xs"
        />

        <div className="ml-auto">
          <PasteIntake roster={roster} onSubmit={onPaste} />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {lanes.map((lane) => (
          <div key={lane.key}>
            {grouping === "person" && (
              <div className="mb-2 flex items-center gap-2">
                <InitialsAvatar person={roster.find((p) => p.id === lane.key) ?? null} size={18} />
                <span className="text-xs font-semibold text-muted-foreground">{lane.label}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STATUS_ORDER.map((status) => {
                const columnTasks = lane.tasks
                  .filter((t) => t.status === status)
                  .sort((a, b) => a.position - b.position);
                return (
                  <div key={status} className="min-w-0 rounded-md bg-muted/40 p-2">
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`} aria-hidden />
                      <span className="text-xs font-semibold">{STATUS_META[status].label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{columnTasks.length}</span>
                    </div>
                    {status === "done" ? (
                      <DoneCardStack tasks={columnTasks} />
                    ) : (
                      <ColumnCards
                        tasks={columnTasks}
                        allProjectTasks={projectTasks}
                        stepOf={stepOf}
                        roster={roster}
                        onOpenTask={onOpenTask}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span>
          {changeCount > 0 ? `${changeCount} change${changeCount === 1 ? "" : "s"} since you last looked` : "Up to date"}
        </span>
        {changeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markSeen}>
            Mark seen
          </Button>
        )}
      </div>
    </div>
  );
}
