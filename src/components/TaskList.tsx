import { PasteIntake } from "@/components/PasteIntake";
import { TaskRow } from "@/components/TaskRow";
import type { Person, Task } from "@/types";
import type { PasteDefaults } from "@/lib/store";

export function TaskList({
  projectId,
  tasks,
  roster,
  onOpenTask,
  onUpdateTask,
  onInsertAfter,
  onPaste,
}: {
  projectId: string;
  tasks: Task[];
  roster: Person[];
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onInsertAfter: (taskId: string, afterTaskId: string | null) => void;
  onPaste: (titles: string[], defaults: PasteDefaults) => Promise<void>;
}) {
  const ordered = tasks.filter((t) => t.projectId === projectId).sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="font-display text-sm font-semibold">Task list</h2>
        <PasteIntake roster={roster} onSubmit={onPaste} />
      </div>

      {ordered.length === 0 ? (
        <div className="px-3 py-10 text-center text-sm text-muted-foreground">
          No tasks yet. Paste a handed-down list to get started.
        </div>
      ) : (
        <div>
          {ordered.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              step={i + 1}
              roster={roster}
              orderedSiblings={ordered}
              onOpen={() => onOpenTask(task.id)}
              onUpdate={(patch) => onUpdateTask(task.id, patch)}
              onInsertAfter={(afterId) => onInsertAfter(task.id, afterId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
