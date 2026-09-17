export type Priority = 1 | 2 | 3 | 4 | 5;
export type Status = "not_started" | "in_progress" | "blocked" | "in_review" | "done";
export type Size = "S" | "M" | "L";
export type CalendarMode = "month" | "week" | "day";

export interface Person {
  id: string;
  name: string;
  initials: string;
  capacityPoints: number;
  active: boolean;
}

export interface Project {
  id: string;
  name: string;
  closeTarget: string | null; // yyyy-MM-dd
  archived: boolean;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  field: "status" | "assigneeId" | "dueDate" | "priority" | "size" | "created";
  from: string | number | null;
  to: string | number | null;
  actorId: string;
  at: string; // ISO
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  mentions: string[]; // roster ids
  at: string; // ISO
}

export interface BlockedOn {
  taskId?: string;
  reason?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  notes: string;
  /** Short plain-language summary — what this task is, why it matters,
   * and why it's headed the way it is — written by whoever's working it
   * for anyone outside the team (e.g. a business owner) to read without
   * needing the rest of the board. Surfaced on the Briefing tab. */
  brief: string;
  priority: Priority;
  status: Status;
  position: number;
  size: Size;
  assigneeId: string | null;
  dueDate: string | null; // yyyy-MM-dd
  blockedOn: BlockedOn | null;
  completedAt: string | null;
  archived: boolean;
  activity: ActivityEntry[];
  comments: TaskComment[];
  createdAt: string;
  createdBy: string;
  /** Bumped on every write; used only to detect "someone else just changed
   * this" while a viewer has a task drawer open with unsaved edits. */
  updatedAt: string;
}

export const PRIORITY_META: Record<Priority, { label: string; token: string }> = {
  5: { label: "Urgent", token: "priority-5" },
  4: { label: "High", token: "priority-4" },
  3: { label: "Normal", token: "priority-3" },
  2: { label: "Low", token: "priority-2" },
  1: { label: "Nice to have", token: "priority-1" },
};

export const STATUS_META: Record<Status, { label: string; token: string }> = {
  not_started: { label: "Not started", token: "status-not-started" },
  in_progress: { label: "In progress", token: "status-in-progress" },
  blocked: { label: "Blocked", token: "status-blocked" },
  in_review: { label: "In review", token: "status-in-review" },
  done: { label: "Done", token: "status-done" },
};

export const STATUS_ORDER: Status[] = ["not_started", "in_progress", "blocked", "in_review", "done"];

export const SIZE_POINTS: Record<Size, number> = { S: 1, M: 3, L: 5 };

export const SIZE_META: Record<Size, { label: string }> = {
  S: { label: "Small" },
  M: { label: "Medium" },
  L: { label: "Large" },
};

export const DEFAULT_CAPACITY_POINTS = 12;

/** Thresholds for computed at-risk/overdue flags — see src/lib/metrics.ts. */
export const RISK_THRESHOLDS = {
  blockedDaysAtRisk: 3,
  inReviewDaysAtRisk: 5,
  unassignedDaysAtRisk: 3,
  projectCloseTargetDaysWindow: 7,
  projectOpenShareAtRisk: 0.3,
  projectStaleDays: 5,
  justStartedDoneShare: 0.2,
};
