import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types";

/**
 * The primary reorder control: pick an existing task in the project and
 * this task moves to sit right after it. Replaces drag-and-drop, which
 * is poor on mobile and unusable by keyboard.
 */
export function InsertAfterMenu({
  task,
  orderedSiblings,
  onInsertAfter,
}: {
  task: Task;
  /** All tasks in the project, position-ordered, `task` included. */
  orderedSiblings: Task[];
  onInsertAfter: (afterTaskId: string | null) => void;
}) {
  const stepOf = new Map(orderedSiblings.map((t, i) => [t.id, i + 1]));
  const others = orderedSiblings.filter((t) => t.id !== task.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
          Insert after…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto scrollbar-thin">
        <DropdownMenuItem onSelect={() => onInsertAfter(null)}>Move to top</DropdownMenuItem>
        <DropdownMenuSeparator />
        {others.map((sibling) => (
          <DropdownMenuItem key={sibling.id} onSelect={() => onInsertAfter(sibling.id)}>
            #{stepOf.get(sibling.id)} {sibling.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
