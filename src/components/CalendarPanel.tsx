import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CalendarMode, Person, Task } from "@/types";
import { addDays, addMonths, addWeeks, format, isSameMonth, isToday, monthGrid, weekGrid } from "@/lib/dates";
import { isOverdue } from "@/lib/metrics";
import { InitialsAvatar, priorityDotClass } from "@/components/ui-bits";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarPanelProps {
  tasks: Task[];
  roster: Person[];
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
  selectedDate: string | null;
  onSelectDate: (iso: string | null) => void;
  onOpenTask: (taskId: string) => void;
}

export function CalendarPanel({
  tasks,
  roster,
  mode,
  onModeChange,
  anchor,
  onAnchorChange,
  selectedDate,
  onSelectDate,
  onOpenTask,
}: CalendarPanelProps) {
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.priority - a.priority);
    }
    return map;
  }, [tasks]);

  const assigneeOf = (t: Task) => roster.find((p) => p.id === t.assigneeId) ?? null;

  const goPrev = () => {
    if (mode === "month") onAnchorChange(addMonths(anchor, -1));
    else if (mode === "week") onAnchorChange(addWeeks(anchor, -1));
    else onAnchorChange(addDays(anchor, -1));
  };
  const goNext = () => {
    if (mode === "month") onAnchorChange(addMonths(anchor, 1));
    else if (mode === "week") onAnchorChange(addWeeks(anchor, 1));
    else onAnchorChange(addDays(anchor, 1));
  };
  const goToday = () => {
    const now = new Date();
    onAnchorChange(now);
    onSelectDate(format(now, "yyyy-MM-dd"));
  };

  const heading =
    mode === "day"
      ? format(anchor, "EEEE, MMMM d, yyyy")
      : mode === "week"
        ? `Week of ${format(weekGrid(anchor)[0], "MMM d, yyyy")}`
        : format(anchor, "MMMM yyyy");

  const handleDayClick = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    onSelectDate(selectedDate === iso ? null : iso);
  };

  return (
    <section className="rounded-md border border-border bg-card" aria-label="Calendar">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-display min-w-[13ch] text-lg font-medium">{heading}</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>
            Today
          </Button>
        </div>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as CalendarMode)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "month" && (
        <div className="p-3">
          <div className="grid grid-cols-7 gap-px text-center font-mono-data text-[11px] uppercase tracking-wide text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-sm bg-border">
            {monthGrid(anchor).map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDay.get(iso) ?? [];
              const inMonth = isSameMonth(day, anchor);
              const selected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "flex min-h-[64px] flex-col items-start gap-1 bg-card p-1.5 text-left transition-colors hover:bg-secondary/60 sm:min-h-[84px] sm:p-2",
                    !inMonth && "bg-muted/40 text-muted-foreground/50",
                    selected && "bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono-data text-xs",
                      isToday(day) && "flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[hsl(var(--today-ring))]",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayTasks.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full ring-1",
                          priorityDotClass(t.priority),
                          isOverdue(t) ? "ring-destructive" : "ring-transparent",
                          t.status === "done" && "opacity-30",
                        )}
                        aria-hidden
                      />
                    ))}
                    {dayTasks.length > 4 && (
                      <span className="font-mono-data text-[9px] leading-none text-muted-foreground">
                        +{dayTasks.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "week" && (
        <div className="grid grid-cols-1 gap-px bg-border p-3 sm:grid-cols-7 sm:gap-px sm:rounded-sm sm:bg-border sm:p-3">
          {weekGrid(anchor).map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(iso) ?? [];
            const selected = selectedDate === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "flex min-h-[110px] flex-col gap-1.5 bg-card p-2 text-left transition-colors hover:bg-secondary/60",
                  selected && "bg-secondary",
                )}
              >
                <div className="flex items-baseline justify-between font-mono-data text-xs text-muted-foreground">
                  <span>{format(day, "EEE")}</span>
                  <span className={cn(isToday(day) && "font-semibold text-[hsl(var(--today-ring))]")}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {dayTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center gap-1 truncate text-xs">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDotClass(t.priority))} aria-hidden />
                      <span className={cn("truncate", t.status === "done" && "text-muted-foreground line-through")}>
                        {t.title}
                      </span>
                      {isOverdue(t) && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="font-mono-data text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mode === "day" && (
        <div className="flex flex-col gap-1.5 p-3">
          {(tasksByDay.get(format(anchor, "yyyy-MM-dd")) ?? []).length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing due on this day.</p>
          )}
          {(tasksByDay.get(format(anchor, "yyyy-MM-dd")) ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenTask(t.id)}
              className="flex items-center gap-3 rounded-sm border-l-2 bg-secondary/40 px-3 py-2 text-left hover:bg-secondary/70"
              style={{ borderLeftColor: `hsl(var(--priority-${t.priority}))` }}
            >
              <InitialsAvatar person={assigneeOf(t)} size={20} />
              <span className={cn("truncate text-sm", t.status === "done" && "text-muted-foreground line-through")}>
                {t.title}
              </span>
              {isOverdue(t) && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-destructive" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
