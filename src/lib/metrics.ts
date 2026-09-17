import { RISK_THRESHOLDS, SIZE_POINTS } from "@/types";
import type { ActivityEntry, Project, Status, Task } from "@/types";
import { daysSince, isOverdue, todayISO, toDate } from "./dates";

export { isOverdue };

/** The `at` timestamp of the entry that put a task into its current
 * status — the last "status"/"created" activity entry, or createdAt if
 * the task has never logged one (shouldn't happen once creation always
 * writes the initial entry, but keeps this total). */
export function statusEnteredAt(task: Task): string {
  let latest: string | null = null;
  for (const e of task.activity) {
    if (e.field !== "status" && e.field !== "created") continue;
    if (!latest || e.at > latest) latest = e.at;
  }
  return latest ?? task.createdAt;
}

export function agingDays(task: Task, now = new Date()): number {
  return daysSince(statusEnteredAt(task), now);
}

export interface RiskResult {
  atRisk: boolean;
  reason: string | null;
}

/** Every flag here is computed from task state — never a field anyone
 * sets by hand. See RISK_THRESHOLDS in types.ts for the tunable numbers. */
export function taskRisk(task: Task, now = new Date()): RiskResult {
  if (task.status === "done" || task.archived) return { atRisk: false, reason: null };

  const overdue = isOverdue(task, todayISO());
  const dwell = agingDays(task, now);

  if (task.status === "blocked" && dwell > RISK_THRESHOLDS.blockedDaysAtRisk) {
    return { atRisk: true, reason: `Blocked for ${dwell} day${dwell === 1 ? "" : "s"}` };
  }
  if (overdue && task.priority >= 4) {
    return { atRisk: true, reason: "Overdue and high priority" };
  }
  if (task.status === "in_review" && dwell > RISK_THRESHOLDS.inReviewDaysAtRisk) {
    return { atRisk: true, reason: `Waiting on review for ${dwell} days` };
  }
  if (!task.assigneeId && daysSince(task.createdAt, now) > RISK_THRESHOLDS.unassignedDaysAtRisk) {
    return { atRisk: true, reason: "Unassigned since creation" };
  }
  return { atRisk: false, reason: null };
}

export type ProjectStatus = "at_risk" | "on_track" | "just_started";

export function projectStatus(project: Project, tasks: Task[], now = new Date()): ProjectStatus {
  const open = tasks.filter((t) => !t.archived);
  const doneCount = open.filter((t) => t.status === "done").length;
  const openShare = open.length ? (open.length - doneCount) / open.length : 0;

  const anyTaskAtRisk = open.some((t) => taskRisk(t, now).atRisk);
  const closeSoon =
    !!project.closeTarget && daysSince(todayISO(), toDate(project.closeTarget)) <= RISK_THRESHOLDS.projectCloseTargetDaysWindow;
  const closeSoonAndBehind = closeSoon && openShare > RISK_THRESHOLDS.projectOpenShareAtRisk;

  const lastActivityAt = open.reduce<string>((latest, t) => {
    const at = statusEnteredAt(t);
    return at > latest ? at : latest;
  }, project.createdAt);
  const stale = daysSince(lastActivityAt, now) > RISK_THRESHOLDS.projectStaleDays;

  if (anyTaskAtRisk || closeSoonAndBehind || stale) return "at_risk";

  const doneShare = open.length ? doneCount / open.length : 0;
  if (doneShare < RISK_THRESHOLDS.justStartedDoneShare) return "just_started";
  return "on_track";
}

// --- Derived KPI metrics -------------------------------------------------

/** The assignee in effect when a task completed, read back from the
 * activity log rather than the (possibly since-changed) current field —
 * "attribute throughput to the assignee at the moment of completion". */
export function assigneeAtCompletion(task: Task): string | null {
  if (!task.completedAt) return task.assigneeId;
  let value: string | null = task.assigneeId;
  let bestAt: string | null = null;
  for (const e of task.activity) {
    if (e.field !== "assigneeId" || e.at > task.completedAt) continue;
    if (!bestAt || e.at > bestAt) {
      bestAt = e.at;
      value = (e.to as string | null) ?? null;
    }
  }
  return value;
}

function firstInProgressAt(task: Task): string | null {
  let earliest: string | null = null;
  for (const e of task.activity) {
    if (e.field !== "status" || e.to !== "in_progress") continue;
    if (!earliest || e.at < earliest) earliest = e.at;
  }
  return earliest;
}

/** Cycle time in hours: first entry into in_progress -> completedAt.
 * Null when the task never entered in_progress (excluded from the
 * median, not counted as zero) or isn't completed. */
export function cycleTimeHours(task: Task): number | null {
  if (!task.completedAt) return null;
  const start = firstInProgressAt(task);
  if (!start) return null;
  const ms = toDate(task.completedAt).getTime() - toDate(start).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function inWindow(iso: string, start: Date, end: Date): boolean {
  const t = toDate(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function throughput(tasks: Task[], start: Date, end: Date, assigneeId?: string | null): number {
  return tasks.filter(
    (t) =>
      !!t.completedAt &&
      inWindow(t.completedAt, start, end) &&
      (assigneeId === undefined || assigneeAtCompletion(t) === assigneeId),
  ).length;
}

export function onTimeRate(tasks: Task[], start: Date, end: Date): number | null {
  const completed = tasks.filter((t) => !!t.completedAt && inWindow(t.completedAt, start, end) && !!t.dueDate);
  if (!completed.length) return null;
  const onTime = completed.filter((t) => t.completedAt! <= t.dueDate!).length;
  return onTime / completed.length;
}

/** Wall-clock time spent in each status, walking the activity log in
 * order and pairing consecutive transitions; the current status runs
 * to `now`. */
export function timeInStatusMs(task: Task, now = new Date()): Record<Status, number> {
  const totals: Record<Status, number> = {
    not_started: 0,
    in_progress: 0,
    blocked: 0,
    in_review: 0,
    done: 0,
  };
  const transitions = [...task.activity]
    .filter((e): e is ActivityEntry & { field: "status" | "created" } => e.field === "status" || e.field === "created")
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  if (!transitions.length) {
    totals[task.status] += now.getTime() - toDate(task.createdAt).getTime();
    return totals;
  }

  let cursorStatus = (transitions[0].to as Status) ?? task.status;
  let cursorAt = toDate(transitions[0].at).getTime();
  for (let i = 1; i < transitions.length; i++) {
    const next = transitions[i];
    const nextAt = toDate(next.at).getTime();
    totals[cursorStatus] += Math.max(0, nextAt - cursorAt);
    cursorStatus = (next.to as Status) ?? cursorStatus;
    cursorAt = nextAt;
  }
  totals[cursorStatus] += Math.max(0, now.getTime() - cursorAt);
  return totals;
}

export function blockedTimeMs(task: Task, now = new Date()): number {
  return timeInStatusMs(task, now).blocked;
}

export function openLoadPoints(tasks: Task[], assigneeId: string | null): number {
  return tasks
    .filter((t) => !t.archived && t.status !== "done" && t.assigneeId === assigneeId)
    .reduce((sum, t) => sum + SIZE_POINTS[t.size], 0);
}

/** Open load broken down by status, for the workload bar's segments —
 * "too much work" and "too much stalled work" need to look different. */
export function openLoadByStatus(tasks: Task[], assigneeId: string | null): Record<Status, number> {
  const totals: Record<Status, number> = { not_started: 0, in_progress: 0, blocked: 0, in_review: 0, done: 0 };
  for (const t of tasks) {
    if (t.archived || t.status === "done" || t.assigneeId !== assigneeId) continue;
    totals[t.status] += SIZE_POINTS[t.size];
  }
  return totals;
}

export function msToDays(ms: number): number {
  return ms / 86_400_000;
}
