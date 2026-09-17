// Phase status is always derived from its tasks, never stored — see the
// Roadmap spec: a stale stored status is worse than none. Every function
// here takes the phase's own tasks as input rather than reaching into a
// wider task list, so callers control exactly what "this phase's tasks"
// means (non-archived, same project, matching phaseId).

import { SIZE_POINTS } from "@/types";
import type { Phase, Task } from "@/types";
import { format, toDate } from "./dates";

export type PhaseStatus = "done" | "in_progress" | "not_started";

export function phaseStatus(tasksInPhase: Task[]): PhaseStatus {
  const live = tasksInPhase.filter((t) => !t.archived);
  if (live.length === 0) return "not_started";
  if (live.every((t) => t.status === "done")) return "done";
  if (live.some((t) => t.status === "in_progress" || t.status === "in_review" || t.status === "done")) {
    return "in_progress";
  }
  return "not_started";
}

/** Earliest by position whose status is in_progress; failing that, the
 * earliest not_started; failing that (everything done), the last phase —
 * "we finished" reads better than silently falling back to phase one. */
export function currentPhaseId(orderedPhases: Phase[], tasksByPhase: Map<string, Task[]>): string | null {
  if (!orderedPhases.length) return null;
  const statusOf = (p: Phase) => phaseStatus(tasksByPhase.get(p.id) ?? []);

  const inProgress = orderedPhases.find((p) => statusOf(p) === "in_progress");
  if (inProgress) return inProgress.id;

  const notStarted = orderedPhases.find((p) => statusOf(p) === "not_started");
  if (notStarted) return notStarted.id;

  return orderedPhases[orderedPhases.length - 1].id;
}

/** Completed share weighted by size points, not task count — matches the
 * workload bars' "points, not counts" rule for the same reason. */
export function phaseCompletionShare(tasksInPhase: Task[]): number {
  const live = tasksInPhase.filter((t) => !t.archived);
  if (!live.length) return 0;
  const total = live.reduce((sum, t) => sum + SIZE_POINTS[t.size], 0);
  const done = live.filter((t) => t.status === "done").reduce((sum, t) => sum + SIZE_POINTS[t.size], 0);
  return total ? done / total : 0;
}

export function formatTargetMonth(yyyyMM: string): string {
  // yyyy-MM parses fine as yyyy-MM-01 for display purposes.
  return format(toDate(`${yyyyMM}-01`), "MMMM yyyy");
}
