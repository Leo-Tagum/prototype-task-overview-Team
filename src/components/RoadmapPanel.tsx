import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewPhaseDialog } from "@/components/NewPhaseDialog";
import { cn } from "@/lib/utils";
import { format } from "@/lib/dates";
import { currentPhaseId, formatTargetMonth, phaseCompletionShare, phaseStatus } from "@/lib/phases";
import type { PhaseStatus } from "@/lib/phases";
import { externalDecisions } from "@/lib/brief";
import type { Person, Phase, Project, Task } from "@/types";

const UNPHASED_ID = "__unphased__";

// Phase status here is a fixed green/amber/grey vocabulary, distinct from
// the 5-way task-status palette used elsewhere (where in-progress is
// teal and blocked is amber) — these reuse the done/blocked/not-started
// tokens purely for their colour, not their task-status meaning.
const PHASE_STATUS_DOT: Record<PhaseStatus, string> = {
  done: "bg-status-done",
  in_progress: "bg-status-blocked",
  not_started: "bg-status-not-started",
};

type Pill = "Done" | "Doing" | "Next";
const PILL_CLASS: Record<Pill, string> = {
  Done: "bg-status-done/15 text-status-done",
  Doing: "bg-status-blocked/15 text-status-blocked",
  Next: "bg-status-not-started/15 text-status-not-started",
};

function pillFor(status: Task["status"]): Pill {
  if (status === "done") return "Done";
  if (status === "not_started") return "Next";
  return "Doing"; // in_progress, in_review, blocked — all active work
}

function railSubline(phase: Phase, tasksInPhase: Task[]): string {
  const status = phaseStatus(tasksInPhase);
  if (status === "done") {
    const latest = tasksInPhase
      .filter((t) => t.completedAt)
      .reduce<string | null>((max, t) => (!max || t.completedAt! > max ? t.completedAt! : max), null);
    return latest ? `Done in ${format(new Date(latest), "MMMM")}` : "Done";
  }
  if (status === "in_progress") return "Working on this now";
  return phase.targetMonth ? formatTargetMonth(phase.targetMonth) : "Not started yet";
}

function GoalHeader({
  project,
  onUpdateGoal,
}: {
  project: Project;
  onUpdateGoal: (goal: string | null, goalWhy: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState(project.goal ?? "");
  const [whyDraft, setWhyDraft] = useState(project.goalWhy ?? "");

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-2">
        <Input
          value={goalDraft}
          onChange={(e) => setGoalDraft(e.target.value)}
          placeholder="Goal — an outcome, e.g. Book 3 more listings this quarter"
          className="h-7 text-xs"
        />
        <Input
          value={whyDraft}
          onChange={(e) => setWhyDraft(e.target.value)}
          placeholder="Why it matters, one line"
          className="h-7 text-xs"
        />
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={() => {
              setGoalDraft(project.goal ?? "");
              setWhyDraft(project.goalWhy ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              onUpdateGoal(goalDraft.trim() || null, whyDraft.trim() || null);
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Goal</div>
        <div className="text-sm font-medium">{project.goal || "No goal set yet"}</div>
        {project.goalWhy && <div className="text-xs text-muted-foreground">{project.goalWhy}</div>}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Edit goal"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RailRow({
  label,
  sublabel,
  status,
  selected,
  onClick,
}: {
  label: string;
  sublabel: string;
  status: PhaseStatus;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-0.5 border-l-[3px] px-2.5 py-2 text-left",
        selected ? "border-status-in-review bg-accent/40" : "border-transparent hover:bg-accent/20",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", PHASE_STATUS_DOT[status])} aria-hidden />
        <span className="truncate text-sm font-medium">{label}</span>
      </span>
      <span className="truncate pl-3.5 text-xs text-muted-foreground">{sublabel}</span>
    </button>
  );
}

function RoadmapTaskRow({ task, roster, onOpen }: { task: Task; roster: Person[]; onOpen: () => void }) {
  const pill = pillFor(task.status);
  const owner = roster.find((p) => p.id === task.assigneeId)?.name ?? "Unassigned";
  const subline =
    task.status === "done" && task.completedAt
      ? `${owner} — Done ${format(new Date(task.completedAt), "MMM d")}`
      : task.status === "blocked" && task.blockedOn?.reason
        ? `${owner} — ${task.blockedOn.reason}`
        : owner;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-2.5 rounded-sm border border-border px-2.5 py-2 text-left hover:border-primary/40"
    >
      <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", PILL_CLASS[pill])}>
        {pill}
      </span>
      <span className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">{subline}</div>
      </span>
    </button>
  );
}

function MainPanel({
  title,
  why,
  tasksInPhase,
  roster,
  onOpenTask,
}: {
  title: string;
  why: string | null;
  tasksInPhase: Task[];
  roster: Person[];
  onOpenTask: (taskId: string) => void;
}) {
  const ordered = [...tasksInPhase].sort((a, b) => a.position - b.position);
  const doneCount = ordered.filter((t) => t.status === "done").length;
  const share = phaseCompletionShare(ordered);
  const decisions = externalDecisions(ordered);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          {ordered.length > 0 ? `${doneCount} of ${ordered.length} done` : "No steps yet"}
          {why ? ` — ${why}` : ""}
        </p>
      </div>

      {ordered.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-status-done" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {ordered.map((t) => (
          <RoadmapTaskRow key={t.id} task={t} roster={roster} onOpen={() => onOpenTask(t.id)} />
        ))}
      </div>

      {decisions.length > 0 && (
        <div className="rounded-md border border-status-blocked/40 bg-status-blocked/10 px-3 py-2 text-xs">
          <span className="font-medium">Waiting on a decision:</span> {decisions[0].blockedOn!.reason}
          {decisions.length > 1 && ` (+${decisions.length - 1} more)`}
        </div>
      )}
    </div>
  );
}

export function RoadmapPanel({
  project,
  phases,
  tasks,
  roster,
  onOpenTask,
  onCreatePhase,
  onUpdateGoal,
}: {
  project: Project;
  phases: Phase[];
  tasks: Task[];
  roster: Person[];
  onOpenTask: (taskId: string) => void;
  onCreatePhase: (name: string, why: string, targetMonth: string | null) => Promise<unknown>;
  onUpdateGoal: (goal: string | null, goalWhy: string | null) => void;
}) {
  const projectPhases = useMemo(
    () => phases.filter((p) => p.projectId === project.id).sort((a, b) => a.position - b.position),
    [phases, project.id],
  );
  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === project.id && !t.archived),
    [tasks, project.id],
  );
  const tasksByPhase = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of projectTasks) {
      if (!t.phaseId) continue;
      const list = map.get(t.phaseId) ?? [];
      list.push(t);
      map.set(t.phaseId, list);
    }
    return map;
  }, [projectTasks]);
  const unphasedTasks = useMemo(() => projectTasks.filter((t) => !t.phaseId), [projectTasks]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    // His first question is "where are we" — open on the current phase,
    // never phase 1. Keyed only on the project so a later status change
    // doesn't yank the selection out from under someone mid-read.
    setSelectedId(currentPhaseId(projectPhases, tasksByPhase));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  if (projectPhases.length === 0) return null;

  const selectedPhase = projectPhases.find((p) => p.id === selectedId) ?? null;
  const isUnphased = selectedId === UNPHASED_ID;
  const selectedTasks = isUnphased ? unphasedTasks : selectedPhase ? tasksByPhase.get(selectedPhase.id) ?? [] : [];

  return (
    <div className="flex flex-col gap-4 min-[560px]:flex-row">
      <div className="flex flex-col gap-3 min-[560px]:w-[230px] min-[560px]:shrink-0">
        <GoalHeader project={project} onUpdateGoal={onUpdateGoal} />

        <div className="flex flex-col gap-0.5">
          {projectPhases.map((phase) => (
            <RailRow
              key={phase.id}
              label={phase.name}
              sublabel={railSubline(phase, tasksByPhase.get(phase.id) ?? [])}
              status={phaseStatus(tasksByPhase.get(phase.id) ?? [])}
              selected={phase.id === selectedId}
              onClick={() => setSelectedId(phase.id)}
            />
          ))}
          {unphasedTasks.length > 0 && (
            <RailRow
              label="Unphased"
              sublabel={`${unphasedTasks.length} task${unphasedTasks.length === 1 ? "" : "s"} not yet slotted in`}
              status={phaseStatus(unphasedTasks)}
              selected={isUnphased}
              onClick={() => setSelectedId(UNPHASED_ID)}
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-status-done" aria-hidden />
            Done
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-status-blocked" aria-hidden />
            In progress
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-status-not-started" aria-hidden />
            Not started
          </span>
        </div>

        <div className="w-full [&>button]:w-full">
          <NewPhaseDialog onCreate={(name, why, targetMonth) => onCreatePhase(name, why, targetMonth)} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <MainPanel
          title={isUnphased ? "Unphased" : selectedPhase?.name ?? ""}
          why={isUnphased ? null : selectedPhase?.why ?? null}
          tasksInPhase={selectedTasks}
          roster={roster}
          onOpenTask={onOpenTask}
        />
      </div>
    </div>
  );
}
