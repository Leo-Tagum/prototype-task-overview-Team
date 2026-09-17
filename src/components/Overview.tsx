import { useMemo } from "react";
import { InitialsAvatar, statusDotClass } from "@/components/ui-bits";
import { STATUS_META, STATUS_ORDER } from "@/types";
import type { Person, Project, Task } from "@/types";
import { isOverdue, projectStatus, taskRisk, weeklyCompletionCounts } from "@/lib/metrics";
import { formatDueLabel } from "@/lib/dates";
import { buildQuickBrief } from "@/lib/brief";
import { cn } from "@/lib/utils";

const PROJECT_STATUS_LABEL: Record<ReturnType<typeof projectStatus>, string> = {
  at_risk: "At risk",
  on_track: "On track",
  just_started: "Just started",
};
const PROJECT_STATUS_CLASS: Record<ReturnType<typeof projectStatus>, string> = {
  at_risk: "bg-destructive/10 text-destructive",
  on_track: "bg-status-done/10 text-status-done",
  just_started: "bg-status-not-started/10 text-status-not-started",
};

function Tile({ label, value, tone }: { label: string; value: number; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className={cn("font-display text-2xl font-semibold", tone === "warn" && value > 0 && "text-destructive")}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function WeeklyTrend({ tasks, now }: { tasks: Task[]; now: Date }) {
  const weeks = useMemo(() => {
    const counts = weeklyCompletionCounts(tasks, 6, now);
    return counts.map((count, idx) => ({
      label: idx === counts.length - 1 ? "This wk" : `-${counts.length - 1 - idx}w`,
      count,
    }));
  }, [tasks, now]);
  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">Six-week completion trend</div>
      <div className="flex items-end gap-2" style={{ height: 64 }}>
        {weeks.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-sm bg-status-done/70" style={{ height: `${(w.count / max) * 48}px` }} title={`${w.count} completed`} />
            <span className="font-mono-data text-[9px] text-muted-foreground">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Overview({
  tasks,
  projects,
  roster,
  onOpenTask,
}: {
  tasks: Task[];
  projects: Project[];
  roster: Person[];
  onOpenTask: (taskId: string) => void;
}) {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86_400_000);

  const doneThisWeek = tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= weekStart).length;
  const blockedCount = tasks.filter((t) => t.status === "blocked" && !t.archived).length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  const attentionItems = useMemo(
    () =>
      tasks
        .filter((t) => !t.archived && t.status !== "done")
        .map((t) => ({ task: t, risk: taskRisk(t, now) }))
        .filter((x) => x.risk.atRisk)
        .sort((a, b) => b.task.priority - a.task.priority)
        .slice(0, 8),
    [tasks, now],
  );

  const brief = useMemo(() => buildQuickBrief(tasks, projects, now), [tasks, projects, now]);
  const teamBriefs = useMemo(
    () => tasks.filter((t) => !t.archived && t.brief.trim() && t.status !== "done"),
    [tasks],
  );

  return (
    <div className="flex flex-col gap-4 p-3">
      {(brief || teamBriefs.length > 0) && (
        <div className="rounded-md border border-border bg-card p-3">
          {brief && (
            <>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Quick brief
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground">
                {brief.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </>
          )}

          {teamBriefs.length > 0 && (
            <div className={brief ? "mt-2 border-t border-border pt-2" : undefined}>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                From the team
              </div>
              {/* Capped height, not item count — every brief stays reachable by
                  scrolling, but the card never grows past a few lines. */}
              <div className="flex max-h-24 flex-col gap-0.5 overflow-y-auto scrollbar-thin">
                {teamBriefs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTask(t.id)}
                    className="flex items-baseline gap-1.5 truncate text-left text-xs hover:underline"
                  >
                    <span className="shrink-0 font-medium">{t.title}</span>
                    <span className="truncate text-muted-foreground">— {t.brief.trim()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Active deals" value={projects.length} />
        <Tile label="Done this week" value={doneThisWeek} />
        <Tile label="Blocked" value={blockedCount} tone="warn" />
        <Tile label="Overdue" value={overdueCount} tone="warn" />
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold">Needs your attention</h2>
        {attentionItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nothing needs attention right now.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {attentionItems.map(({ task, risk }) => {
              const assignee = roster.find((p) => p.id === task.assigneeId) ?? null;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask(task.id)}
                  className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-left hover:border-destructive/40"
                >
                  <InitialsAvatar person={assignee} size={20} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
                  <span className="shrink-0 text-xs text-destructive">{risk.reason}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold">Deals in flight</h2>
        <div className="flex flex-col gap-2">
          {projects.map((project) => {
            const projTasks = tasks.filter((t) => t.projectId === project.id && !t.archived);
            const total = projTasks.length || 1;
            const status = projectStatus(project, projTasks, now);
            return (
              <div key={project.id} className="rounded-md border border-border bg-card p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="font-medium">{project.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", PROJECT_STATUS_CLASS[status])}>
                      {PROJECT_STATUS_LABEL[status]}
                    </span>
                    {project.closeTarget && (
                      <span className="text-xs text-muted-foreground">
                        Close: {formatDueLabel({ dueDate: project.closeTarget })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {STATUS_ORDER.map((s) => {
                    const count = projTasks.filter((t) => t.status === s).length;
                    if (!count) return null;
                    return <div key={s} className={statusDotClass(s)} style={{ width: `${(count / total) * 100}%` }} title={STATUS_META[s].label} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <WeeklyTrend tasks={tasks} now={now} />
    </div>
  );
}
