import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday as isTodayFns,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Task } from "@/types";

export const DATE_FMT = "yyyy-MM-dd";

export function todayISO(): string {
  return format(new Date(), DATE_FMT);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toDate(iso: string): Date {
  return parseISO(iso);
}

export function isOverdue(task: Pick<Task, "dueDate" | "status">, todayIso = todayISO()): boolean {
  if (!task.dueDate || task.status === "done") return false;
  return task.dueDate < todayIso;
}

export function daysSince(iso: string, now = new Date()): number {
  return differenceInCalendarDays(now, parseISO(iso));
}

export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export function weekGrid(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export { isSameDay, isSameMonth, isTodayFns as isToday, addDays, addWeeks, addMonths, format };

export function formatDueLabel(task: Pick<Task, "dueDate">): string {
  if (!task.dueDate) return "No due date";
  const d = parseISO(task.dueDate);
  return isTodayFns(d) ? "Today" : format(d, "EEE, MMM d");
}
