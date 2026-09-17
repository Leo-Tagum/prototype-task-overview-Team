// The Overview screen's "Quick brief" — three sentence-template lines a
// non-technical reader can forward verbatim. Deliberately NOT a model
// call: it must render instantly on the most-viewed screen, and every
// number in it must trace to data already computed in this module (the
// activity log, completedAt, or the at-risk rules) so it can never state
// something the underlying data doesn't support. Adding a new situation
// means adding a new template branch below, never relaxing that rule.

import type { Project, Task } from "@/types";
import { DATE_FMT, format, formatDueLabel } from "./dates";
import { agingDays, projectStatus, statusEnteredAt, weeklyCompletionCounts } from "./metrics";

export interface QuickBrief {
  lines: [string, string, string];
}

function plural(n: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${n} ${n === 1 ? noun : pluralNoun}`;
}

// --- Line 1: what moved --------------------------------------------------

function trendPhrase(thisWeek: number, priorAvg: number): string {
  if (priorAvg === 0) return "more than the last month";
  const ratio = thisWeek / priorAvg;
  if (ratio >= 1.5) return "well ahead of the last month";
  if (ratio >= 1.15) return "ahead of the last month";
  if (ratio > 0.85) return "in line with the last month";
  if (ratio > 0.5) return "behind the last month";
  return "well behind the last month";
}

function lineWhatMoved(tasks: Task[], now: Date): string {
  const weekly = weeklyCompletionCounts(tasks, 5, now); // [-4w, -3w, -2w, -1w, this week]
  const thisWeek = weekly[weekly.length - 1];
  const priorWeeks = weekly.slice(0, -1);
  const priorAvg = priorWeeks.reduce((s, n) => s + n, 0) / priorWeeks.length;

  if (thisWeek === 0) {
    const inProgress = tasks.filter((t) => !t.archived && t.status === "in_progress").length;
    return inProgress > 0
      ? `No tasks completed this week; ${plural(inProgress, "task")} still in progress.`
      : "No tasks completed this week.";
  }

  return `${plural(thisWeek, "task")} done this week, ${trendPhrase(thisWeek, priorAvg)}.`;
}

// --- Line 2: what's stuck --------------------------------------------------

interface BlockerGroup {
  label: string;
  taskIds: string[];
  maxDwellDays: number;
  oldestBlockedAt: string;
}

/** Groups currently-blocked tasks by what's blocking them — a linked
 * task's title, or the free-text reason — so "the biggest blocker" means
 * the same obstacle named once, not one line per task. */
function blockerGroups(tasks: Task[], now: Date): BlockerGroup[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blocked = tasks.filter((t) => !t.archived && t.status === "blocked");
  const groups = new Map<string, BlockerGroup>();

  for (const t of blocked) {
    const linkedTitle = t.blockedOn?.taskId ? byId.get(t.blockedOn.taskId)?.title : undefined;
    const reason = t.blockedOn?.reason?.trim();
    const key = linkedTitle ? `task:${t.blockedOn!.taskId}` : reason ? `reason:${reason.toLowerCase()}` : "unspecified";
    const label = linkedTitle ?? reason ?? "an unspecified blocker";
    const enteredAt = statusEnteredAt(t);
    const dwell = agingDays(t, now);

    const existing = groups.get(key);
    if (existing) {
      existing.taskIds.push(t.id);
      existing.maxDwellDays = Math.max(existing.maxDwellDays, dwell);
      if (enteredAt < existing.oldestBlockedAt) existing.oldestBlockedAt = enteredAt;
    } else {
      groups.set(key, { label, taskIds: [t.id], maxDwellDays: dwell, oldestBlockedAt: enteredAt });
    }
  }
  return [...groups.values()];
}

/** Most tasks blocked wins; a tie goes to whichever has been blocking
 * something the longest. */
function biggestBlocker(groups: BlockerGroup[]): BlockerGroup | null {
  if (!groups.length) return null;
  const maxCount = Math.max(...groups.map((g) => g.taskIds.length));
  const tied = groups.filter((g) => g.taskIds.length === maxCount);
  tied.sort((a, b) => (a.oldestBlockedAt < b.oldestBlockedAt ? -1 : 1));
  return tied[0];
}

function atRiskProjectCount(projects: Project[], tasks: Task[], now: Date): { count: number; onlyName: string | null } {
  const atRisk = projects.filter((p) => projectStatus(p, tasks.filter((t) => t.projectId === p.id), now) === "at_risk");
  return { count: atRisk.length, onlyName: atRisk.length === 1 ? atRisk[0].name : null };
}

function nearestCloseTarget(projects: Project[], now: Date): { name: string; dueDate: string } | null {
  const today = format(now, DATE_FMT);
  const upcoming = projects
    .filter((p) => !!p.closeTarget && p.closeTarget >= today)
    .sort((a, b) => a.closeTarget!.localeCompare(b.closeTarget!));
  return upcoming[0] ? { name: upcoming[0].name, dueDate: upcoming[0].closeTarget! } : null;
}

function lineWhatsStuck(tasks: Task[], projects: Project[], now: Date): string {
  const groups = blockerGroups(tasks, now);
  const biggest = biggestBlocker(groups);
  const { count: atRiskCount, onlyName } = atRiskProjectCount(projects, tasks, now);

  if (!biggest) {
    if (atRiskCount === 0) {
      const closeTarget = nearestCloseTarget(projects, now);
      return closeTarget
        ? `Nothing is blocked. Next close target: ${closeTarget.name}, ${formatDueLabel({ dueDate: closeTarget.dueDate })}.`
        : "Nothing is blocked. No close dates are set yet.";
    }
    return `Nothing is blocked, but ${
      atRiskCount === 1 ? `${onlyName} is at risk` : `${plural(atRiskCount, "deal")} are at risk`
    }.`;
  }

  const riskClause =
    atRiskCount === 0
      ? "no deals currently at risk"
      : atRiskCount === 1
        ? `${onlyName} is the only deal at risk`
        : `${plural(atRiskCount, "deal")} are at risk`;

  return `${plural(biggest.taskIds.length, "task")} blocked ${plural(biggest.maxDwellDays, "day")} on ${biggest.label}; ${riskClause}.`;
}

// --- Line 3: what needs the reader ------------------------------------------

/** A blocked task with a stated reason but no linked task is blocked on
 * something outside the team's own work queue — an external input or
 * decision, which on a small team with no separate "decision" field is
 * the closest honest proxy for "waiting on you" available in the data. */
function externalDecisions(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.archived && t.status === "blocked" && t.blockedOn?.reason && !t.blockedOn?.taskId)
    .sort((a, b) => (statusEnteredAt(a) < statusEnteredAt(b) ? -1 : 1));
}

function lineNeedsYou(tasks: Task[]): string {
  const decisions = externalDecisions(tasks);
  if (decisions.length === 0) return "Nothing needs you today.";
  const first = decisions[0].blockedOn!.reason!.trim();
  if (decisions.length === 1) return `One decision from you: ${first}.`;
  return `${plural(decisions.length, "decision")} from you — starting with ${first}.`;
}

// --- Assembly ---------------------------------------------------------------

/** Null when there's nothing to brief on yet — a brand-new board prints
 * three lines of zeros otherwise, which is worse than no section. */
export function buildQuickBrief(tasks: Task[], projects: Project[], now = new Date()): QuickBrief | null {
  const liveTasks = tasks.filter((t) => !t.archived);
  if (liveTasks.length === 0) return null;

  return {
    lines: [lineWhatMoved(liveTasks, now), lineWhatsStuck(liveTasks, projects, now), lineNeedsYou(liveTasks)],
  };
}
