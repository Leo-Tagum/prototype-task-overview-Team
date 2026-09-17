import { cn } from "@/lib/utils";
import { PRIORITY_META, SIZE_META, STATUS_META } from "@/types";
import type { Person, Priority, Size, Status } from "@/types";

// Full literal class names so Tailwind's build-time scanner can find
// them — a templated `bg-${x}` string is invisible to that scanner.
const PRIORITY_DOT: Record<Priority, string> = {
  5: "bg-priority-5",
  4: "bg-priority-4",
  3: "bg-priority-3",
  2: "bg-priority-2",
  1: "bg-priority-1",
};
const PRIORITY_TEXT: Record<Priority, string> = {
  5: "text-priority-5",
  4: "text-priority-4",
  3: "text-priority-3",
  2: "text-priority-2",
  1: "text-priority-1",
};

export function priorityDotClass(priority: Priority) {
  return PRIORITY_DOT[priority];
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        "border-current/20",
        PRIORITY_TEXT[priority],
        className,
      )}
      title={`Priority ${priority} · ${PRIORITY_META[priority].label}`}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[priority])} aria-hidden />
      P{priority} {PRIORITY_META[priority].label}
    </span>
  );
}

const STATUS_BG: Record<Status, string> = {
  not_started: "bg-status-not-started",
  in_progress: "bg-status-in-progress",
  blocked: "bg-status-blocked",
  in_review: "bg-status-in-review",
  done: "bg-status-done",
};
const STATUS_TEXT: Record<Status, string> = {
  not_started: "text-status-not-started",
  in_progress: "text-status-in-progress",
  blocked: "text-status-blocked",
  in_review: "text-status-in-review",
  done: "text-status-done",
};

export function statusDotClass(status: Status) {
  return STATUS_BG[status];
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium",
        "border-current/20",
        STATUS_TEXT[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_BG[status])} aria-hidden />
      {STATUS_META[status].label}
    </span>
  );
}

export function SizeBadge({ size, className }: { size: Size; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
      title={SIZE_META[size].label}
    >
      {size}
    </span>
  );
}

export function InitialsAvatar({
  person,
  size = 22,
  className,
}: {
  person: Pick<Person, "name" | "initials"> | null;
  size?: number;
  className?: string;
}) {
  const initials = person?.initials || "?";
  const name = person?.name ?? "Unassigned";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-mono-data text-[10px] font-semibold text-secondary-foreground ring-1 ring-border",
        !person && "border border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
      title={name}
    >
      {initials}
    </span>
  );
}

export function StepNumber({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("font-mono-data text-[11px] font-semibold text-muted-foreground", className)}>
      #{n}
    </span>
  );
}

export function OverdueRing({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full bg-destructive ring-2 ring-destructive/30", className)}
      title="Overdue"
      aria-hidden
    />
  );
}

export function AtRiskFlag({ reason, className }: { reason: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive",
        className,
      )}
      title={reason}
    >
      ⚠ At risk
    </span>
  );
}
