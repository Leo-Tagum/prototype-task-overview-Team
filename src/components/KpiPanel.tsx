import { Fragment, useMemo } from "react";
import { InitialsAvatar } from "@/components/ui-bits";
import type { Person, Task } from "@/types";
import {
  assigneeAtCompletion,
  blockedTimeMs,
  cycleTimeHours,
  median,
  msToDays,
  onTimeRate,
  openLoadPoints,
  throughput,
} from "@/lib/metrics";

const WINDOW_DAYS = 28;

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="font-display text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

function fmtPct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}
function fmtDays(v: number | null): string {
  return v == null ? "—" : v < 1 ? "<1d" : `${v.toFixed(1)}d`;
}

export function KpiPanel({ tasks, roster }: { tasks: Task[]; roster: Person[] }) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const active = roster.filter((p) => p.active);

  const teamThroughput = throughput(tasks, windowStart, now);
  const teamCycleValues = tasks
    .filter((t) => t.completedAt && new Date(t.completedAt) >= windowStart)
    .map((t) => cycleTimeHours(t))
    .filter((v): v is number => v !== null);
  const teamCycleMedianHours = median(teamCycleValues);
  const teamOnTime = onTimeRate(tasks, windowStart, now);
  const teamBlockedDays = msToDays(tasks.filter((t) => !t.archived).reduce((sum, t) => sum + blockedTimeMs(t, now), 0));

  const perPerson = useMemo(
    () =>
      active.map((person) => {
        const personCompleted = tasks.filter(
          (t) => t.completedAt && new Date(t.completedAt) >= windowStart && assigneeAtCompletion(t) === person.id,
        );
        const cycleValues = personCompleted.map((t) => cycleTimeHours(t)).filter((v): v is number => v !== null);
        const cycleMedianHours = median(cycleValues);
        const blockedMs = personCompleted.reduce((sum, t) => sum + blockedTimeMs(t, now), 0);
        const totalCycleMs = cycleValues.reduce((sum, h) => sum + h * 3_600_000, 0);
        const blockedShare = totalCycleMs > 0 ? blockedMs / totalCycleMs : 0;

        let line: string | null = null;
        if (cycleMedianHours != null && teamCycleMedianHours != null && teamCycleMedianHours > 0) {
          const ratio = cycleMedianHours / teamCycleMedianHours;
          if (ratio >= 1.3 && blockedShare > 0.05) {
            const blockerReason = personCompleted.find((t) => t.blockedOn?.reason)?.blockedOn?.reason;
            line = `${person.name}'s cycle time is ${ratio.toFixed(1)}× the median; ${Math.round(blockedShare * 100)}% of it was spent blocked${blockerReason ? `, waiting on ${blockerReason}` : ""}.`;
          }
        }

        return {
          person,
          throughputCount: throughput(tasks, windowStart, now, person.id),
          cycleMedianDays: cycleMedianHours == null ? null : cycleMedianHours / 24,
          onTime: onTimeRate(personCompleted, windowStart, now),
          openLoad: openLoadPoints(tasks, person.id),
          line,
        };
      }),
    [active, tasks, windowStart, now, teamCycleMedianHours],
  );

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <h2 className="mb-2 font-display text-sm font-semibold">Team — last {WINDOW_DAYS} days</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Throughput" value={String(teamThroughput)} hint="tasks completed" />
          <StatTile label="Median cycle time" value={fmtDays(teamCycleMedianHours == null ? null : teamCycleMedianHours / 24)} />
          <StatTile label="On-time rate" value={fmtPct(teamOnTime)} hint="of completed tasks with a due date" />
          <StatTile label="Blocked time" value={fmtDays(teamBlockedDays)} hint="across all open work — a process signal, not a person one" />
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold">Per person</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Throughput</th>
                <th className="px-3 py-2 font-medium">Median cycle time</th>
                <th className="px-3 py-2 font-medium">On-time</th>
                <th className="px-3 py-2 font-medium">Open load</th>
              </tr>
            </thead>
            <tbody>
              {perPerson.map((row) => (
                <Fragment key={row.person.id}>
                  <tr className="border-t border-border">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <InitialsAvatar person={row.person} size={18} />
                        {row.person.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono-data">{row.throughputCount}</td>
                    <td className="px-3 py-2 font-mono-data">{fmtDays(row.cycleMedianDays)}</td>
                    <td className="px-3 py-2 font-mono-data">{fmtPct(row.onTime)}</td>
                    <td className="px-3 py-2 font-mono-data">{row.openLoad}pt</td>
                  </tr>
                  {row.line && (
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={5} className="px-3 py-1.5 text-xs text-muted-foreground">
                        {row.line}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
