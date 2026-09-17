import { useCallback, useMemo, useState } from "react";
import type { Task } from "@/types";

function key(scopeId: string) {
  return `taskTracker.lastViewed.${scopeId}`;
}

const EPOCH = new Date(0).toISOString();

/**
 * Per-viewer "N changes since you last looked" — the async-standup
 * replacement described in the plan. Personal storage only; each
 * viewer's own edits don't count toward their own counter.
 */
export function useChangesSinceLastLook(scopeId: string, tasks: Task[], viewerId: string) {
  const [lastViewedAt, setLastViewedAt] = useState<string>(() => {
    try {
      return window.localStorage.getItem(key(scopeId)) ?? EPOCH;
    } catch {
      return EPOCH;
    }
  });

  const count = useMemo(() => {
    let n = 0;
    for (const t of tasks) {
      for (const e of t.activity) {
        if (e.field === "created") continue;
        if (e.at > lastViewedAt && e.actorId !== viewerId) n++;
      }
      for (const c of t.comments) {
        if (c.at > lastViewedAt && c.authorId !== viewerId) n++;
      }
    }
    return n;
  }, [tasks, lastViewedAt, viewerId]);

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    setLastViewedAt(now);
    try {
      window.localStorage.setItem(key(scopeId), now);
    } catch {
      // best-effort only
    }
  }, [scopeId]);

  return { count, markSeen };
}
