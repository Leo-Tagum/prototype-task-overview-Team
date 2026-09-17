import { useCallback, useEffect, useRef, useState } from "react";
import { resolveCapability } from "./claude";
import { newId } from "./id";
import { nowISO } from "./dates";
import type { ActivityEntry, Person, Project, Task } from "@/types";
import { DEFAULT_CAPACITY_POINTS } from "@/types";

const LOCAL_TASKS_KEY = "taskTracker.tasks.v1";
const LOCAL_ROSTER_KEY = "taskTracker.roster.v1";
const LOCAL_PROJECTS_KEY = "taskTracker.projects.v1";

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only — a private window or full quota just means no persistence
  }
}

// Minimal structural types for the `db` capability namespace, matching
// the runtime contract without importing its ambient .d.ts.
interface DbDocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DbQuerySnapshot {
  docs: DbDocSnapshot[];
}
interface DbAcquireResult {
  acquired: boolean;
}
interface DbDocRef {
  get(): Promise<DbDocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  acquire(options: { holder: string; ttlMs?: number }): Promise<DbAcquireResult>;
  onSnapshot(
    next: (snap: DbDocSnapshot) => void,
    error?: (e: unknown) => void,
  ): () => void;
}
interface DbCollectionRef {
  doc(id?: string): DbDocRef;
  onSnapshot(
    next: (snap: DbQuerySnapshot) => void,
    error?: (e: unknown) => void,
  ): () => void;
}
interface DbNamespace {
  doc(path: string): DbDocRef;
  collection(path: string): DbCollectionRef;
}
interface AssetsNamespace {
  upload(blob: Blob, options?: { type?: string }): Promise<{
    id: string;
    url: string;
    sizeBytes: number;
    contentType: string;
  }>;
}

export type StoreBackend = "cloud" | "local";

/** Fields whose changes are auto-logged to a task's activity array. */
const LOGGED_FIELDS = ["status", "assigneeId", "dueDate", "priority", "size"] as const;
type LoggedField = (typeof LOGGED_FIELDS)[number];

/**
 * The single place a task's fields are ever merged with a patch. Every
 * write path (cloud or local) goes through this, so the activity log and
 * completedAt derivation can never be skipped by a component that edits
 * fields directly.
 */
function mergeTaskPatch(
  current: Task,
  patch: Partial<Task>,
  actorId: string,
): { merged: Task; changedTopLevelKeys: string[] } {
  const at = nowISO();
  const newEntries: ActivityEntry[] = [];
  const changedTopLevelKeys = new Set<string>();

  for (const field of LOGGED_FIELDS as readonly LoggedField[]) {
    if (!(field in patch)) continue;
    const from = current[field] as string | number | null;
    const to = patch[field] as unknown as string | number | null;
    if (from === to) continue;
    newEntries.push({ id: newId(), field, from, to, actorId, at });
    changedTopLevelKeys.add(field);
  }

  let completedAt = current.completedAt;
  if (patch.status !== undefined && patch.status !== current.status) {
    if (patch.status === "done" && current.status !== "done") {
      completedAt = at;
      changedTopLevelKeys.add("completedAt");
    } else if (patch.status !== "done" && current.status === "done") {
      completedAt = null;
      changedTopLevelKeys.add("completedAt");
    }
  }

  for (const key of Object.keys(patch) as (keyof Task)[]) {
    if (key === "activity" || key === "comments") continue; // never patched directly
    if (current[key] !== (patch as Record<string, unknown>)[key]) {
      changedTopLevelKeys.add(key);
    }
  }

  const merged: Task = {
    ...current,
    ...patch,
    completedAt,
    activity: newEntries.length ? [...current.activity, ...newEntries] : current.activity,
    updatedAt: at,
  };
  if (newEntries.length) changedTopLevelKeys.add("activity");
  changedTopLevelKeys.add("updatedAt");

  return { merged, changedTopLevelKeys: [...changedTopLevelKeys] };
}

/** Backfills fields added to the Task schema after tasks already existed
 * in storage — a doc written before a field existed simply doesn't have
 * it, so every read site funnels through here rather than trusting the
 * stored shape to match the current type. */
function normalizeTask(raw: unknown): Task {
  const t = raw as Task;
  return { ...t, brief: t.brief ?? "" };
}

function parseMentions(body: string, roster: Person[]): string[] {
  const found = new Set<string>();
  for (const person of roster) {
    const token = `@${person.name}`;
    if (body.includes(token)) found.add(person.id);
  }
  return [...found];
}

export interface PasteDefaults {
  priority: Task["priority"];
  status: Task["status"];
  size: Task["size"];
  assigneeId: string | null;
}

export function useTaskStore(viewerId: string) {
  const dbRef = useRef<DbNamespace | null>(null);
  const assetsRef = useRef<AssetsNamespace | null>(null);
  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState<StoreBackend>("local");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roster, setRoster] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    let unsubTasks: (() => void) | undefined;
    let unsubRoster: (() => void) | undefined;
    let unsubProjects: (() => void) | undefined;

    (async () => {
      const db = await resolveCapability<DbNamespace>("db");
      if (cancelled) return;

      if (db) {
        dbRef.current = db;
        setBackend("cloud");

        unsubTasks = db.collection("tasks").onSnapshot(
          (snap) => {
            const rows = snap.docs
              .map((d) => {
                const data = d.data();
                return data ? normalizeTask(data) : undefined;
              })
              .filter((t): t is Task => !!t && !!t.id && !t.archived);
            setTasks(rows);
            setReady(true);
          },
          () => setReady(true),
        );
        unsubRoster = db.collection("roster").onSnapshot((snap) => {
          const rows = snap.docs
            .map((d) => d.data() as Person | undefined)
            .filter((p): p is Person => !!p && !!p.id);
          setRoster(rows);
        });
        unsubProjects = db.collection("projects").onSnapshot((snap) => {
          const rows = snap.docs
            .map((d) => d.data() as Project | undefined)
            .filter((p): p is Project => !!p && !!p.id && !p.archived);
          setProjects(rows);
        });
      } else {
        setTasks(
          loadLocal(LOCAL_TASKS_KEY, [] as Task[])
            .map((t) => normalizeTask(t))
            .filter((t) => !t.archived),
        );
        setRoster(loadLocal(LOCAL_ROSTER_KEY, [] as Person[]));
        setProjects(loadLocal(LOCAL_PROJECTS_KEY, [] as Project[]).filter((p) => !p.archived));
        setBackend("local");
        setReady(true);
      }

      const assets = await resolveCapability<AssetsNamespace>("assets");
      if (!cancelled) assetsRef.current = assets;
    })();

    return () => {
      cancelled = true;
      unsubTasks?.();
      unsubRoster?.();
      unsubProjects?.();
    };
  }, []);

  // Local backend persists the full collections (including archived rows,
  // which the loaded state above already filtered out of view) on every
  // change; cloud backend is already durable.
  const allLocalTasksRef = useRef<Task[]>([]);
  const allLocalProjectsRef = useRef<Project[]>([]);
  useEffect(() => {
    if (backend !== "local" || !ready) return;
    allLocalTasksRef.current = tasks;
    saveLocal(LOCAL_TASKS_KEY, tasks);
  }, [tasks, backend, ready]);
  useEffect(() => {
    if (backend !== "local" || !ready) return;
    saveLocal(LOCAL_ROSTER_KEY, roster);
  }, [roster, backend, ready]);
  useEffect(() => {
    if (backend !== "local" || !ready) return;
    allLocalProjectsRef.current = projects;
    saveLocal(LOCAL_PROJECTS_KEY, projects);
  }, [projects, backend, ready]);

  /**
   * Best-effort single-writer coordination for a task doc: all mutation
   * paths in this app acquire a short lease before read-modify-write, so
   * concurrent edits from two open tabs serialize instead of racing. The
   * `db` capability's leases are cooperative, not a lock on other
   * writers — this only helps because every writer here is our own code.
   */
  const withTaskLease = useCallback(async (ref: DbDocRef, fn: () => Promise<void>) => {
    let acquired = false;
    for (let attempt = 0; attempt < 2 && !acquired; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await ref.acquire({ holder: viewerId, ttlMs: 4000 });
        acquired = res.acquired;
      } catch {
        break;
      }
    }
    await fn();
  }, [viewerId]);

  const getFreshTask = useCallback(async (taskId: string): Promise<Task | null> => {
    if (backend === "cloud" && dbRef.current) {
      const snap = await dbRef.current.collection("tasks").doc(taskId).get();
      const data = snap.exists ? snap.data() : undefined;
      return data ? normalizeTask(data) : null;
    }
    return allLocalTasksRef.current.find((t) => t.id === taskId) ?? tasks.find((t) => t.id === taskId) ?? null;
  }, [backend, tasks]);

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<Task>) => {
      if (backend === "cloud" && dbRef.current) {
        const ref = dbRef.current.collection("tasks").doc(taskId);
        await withTaskLease(ref, async () => {
          const current = await getFreshTask(taskId);
          if (!current) return;
          const { merged, changedTopLevelKeys } = mergeTaskPatch(current, patch, viewerId);
          const body: Record<string, unknown> = {};
          for (const key of changedTopLevelKeys) body[key] = (merged as unknown as Record<string, unknown>)[key];
          await ref.update(body);
        });
      } else {
        setTasks((prev) => {
          const idx = prev.findIndex((t) => t.id === taskId);
          if (idx === -1) return prev;
          const { merged } = mergeTaskPatch(prev[idx], patch, viewerId);
          const next = [...prev];
          next[idx] = merged;
          return next;
        });
      }
    },
    [backend, viewerId, withTaskLease, getFreshTask],
  );

  /** Position-only move: no activity entry (position isn't a logged field). */
  const reorderTask = useCallback(
    async (taskId: string, position: number) => {
      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("tasks").doc(taskId).update({ position, updatedAt: nowISO() });
      } else {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, position, updatedAt: nowISO() } : t)));
      }
    },
    [backend],
  );

  const addComment = useCallback(
    async (taskId: string, body: string) => {
      const comment = { id: newId(), authorId: viewerId, body, mentions: parseMentions(body, roster), at: nowISO() };
      if (backend === "cloud" && dbRef.current) {
        const ref = dbRef.current.collection("tasks").doc(taskId);
        await withTaskLease(ref, async () => {
          const current = await getFreshTask(taskId);
          if (!current) return;
          await ref.update({ comments: [...current.comments, comment], updatedAt: nowISO() });
        });
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, comments: [...t.comments, comment], updatedAt: nowISO() } : t)),
        );
      }
    },
    [backend, viewerId, roster, withTaskLease, getFreshTask],
  );

  const maxPositionForProject = useCallback(
    (projectId: string) => tasks.filter((t) => t.projectId === projectId).reduce((max, t) => Math.max(max, t.position), 0),
    [tasks],
  );

  const createTask = useCallback(
    async (input: {
      projectId: string;
      title: string;
      position: number;
      priority?: Task["priority"];
      status?: Task["status"];
      size?: Task["size"];
      assigneeId?: string | null;
      dueDate?: string | null;
    }): Promise<Task> => {
      const at = nowISO();
      const task: Task = {
        id: newId(),
        projectId: input.projectId,
        title: input.title,
        notes: "",
        brief: "",
        priority: input.priority ?? 3,
        status: input.status ?? "not_started",
        position: input.position,
        size: input.size ?? "M",
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ?? null,
        blockedOn: null,
        completedAt: null,
        archived: false,
        activity: [
          { id: newId(), field: "created", from: null, to: input.status ?? "not_started", actorId: viewerId, at },
        ],
        comments: [],
        createdAt: at,
        createdBy: viewerId,
        updatedAt: at,
      };
      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("tasks").doc(task.id).set(task as unknown as Record<string, unknown>);
      } else {
        setTasks((prev) => [...prev, task]);
      }
      return task;
    },
    [backend, viewerId],
  );

  const createTasksFromPaste = useCallback(
    async (projectId: string, titles: string[], defaults: PasteDefaults) => {
      let base = maxPositionForProject(projectId);
      for (const title of titles) {
        base += 1000;
        await createTask({
          projectId,
          title,
          position: base,
          priority: defaults.priority,
          status: defaults.status,
          size: defaults.size,
          assigneeId: defaults.assigneeId,
        });
      }
    },
    [createTask, maxPositionForProject],
  );

  /** Recomputes position as the midpoint of `after` and its successor in
   * the project's position-ordered sequence (or the tail, if `after` is
   * the last task / null means "insert at the head"). */
  const insertAfter = useCallback(
    async (projectId: string, taskId: string, afterTaskId: string | null) => {
      const siblings = tasks.filter((t) => t.projectId === projectId && t.id !== taskId).sort((a, b) => a.position - b.position);
      let newPosition: number;
      if (afterTaskId === null) {
        const first = siblings[0];
        newPosition = first ? first.position - 1000 : 1000;
      } else {
        const idx = siblings.findIndex((t) => t.id === afterTaskId);
        const after = siblings[idx];
        const next = siblings[idx + 1];
        if (!after) return;
        newPosition = next ? (after.position + next.position) / 2 : after.position + 1000;
      }
      await reorderTask(taskId, newPosition);
    },
    [tasks, reorderTask],
  );

  const archiveTask = useCallback(
    async (taskId: string) => {
      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("tasks").doc(taskId).update({ archived: true, updatedAt: nowISO() });
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        allLocalTasksRef.current = allLocalTasksRef.current.map((t) =>
          t.id === taskId ? { ...t, archived: true } : t,
        );
        saveLocal(LOCAL_TASKS_KEY, allLocalTasksRef.current);
      }
    },
    [backend],
  );

  const addPerson = useCallback(
    async (name: string): Promise<Person> => {
      const person: Person = {
        id: newId(),
        name,
        initials: name
          .split(/\s+/)
          .map((p) => p[0]?.toUpperCase())
          .filter(Boolean)
          .slice(0, 2)
          .join(""),
        capacityPoints: DEFAULT_CAPACITY_POINTS,
        active: true,
      };
      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("roster").doc(person.id).set(person as unknown as Record<string, unknown>);
      } else {
        setRoster((prev) => [...prev, person]);
      }
      return person;
    },
    [backend],
  );

  const updatePersonCapacity = useCallback(
    async (personId: string, capacityPoints: number) => {
      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("roster").doc(personId).update({ capacityPoints });
      } else {
        setRoster((prev) => prev.map((p) => (p.id === personId ? { ...p, capacityPoints } : p)));
      }
    },
    [backend],
  );

  const createProject = useCallback(
    async (name: string, closeTarget: string | null): Promise<Project> => {
      const project: Project = { id: newId(), name, closeTarget, archived: false, createdAt: nowISO() };
      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("projects").doc(project.id).set(project as unknown as Record<string, unknown>);
      } else {
        setProjects((prev) => [...prev, project]);
      }
      return project;
    },
    [backend],
  );

  const archiveProject = useCallback(
    async (projectId: string) => {
      // Cascade: a project's tasks become unreachable ghosts otherwise —
      // still counted in Calendar/Overview/Workload/KPI (none of which are
      // project-scoped) but with no way to open them, since the project
      // that would let you select them into List/Board is gone.
      const toArchive = tasks.filter((t) => t.projectId === projectId);
      for (const t of toArchive) await archiveTask(t.id);

      if (backend === "cloud" && dbRef.current) {
        await dbRef.current.collection("projects").doc(projectId).update({ archived: true });
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        allLocalProjectsRef.current = allLocalProjectsRef.current.map((p) =>
          p.id === projectId ? { ...p, archived: true } : p,
        );
        saveLocal(LOCAL_PROJECTS_KEY, allLocalProjectsRef.current);
      }
    },
    [backend, tasks, archiveTask],
  );

  const uploadAttachment = useCallback(async (file: File) => {
    const assets = assetsRef.current;
    if (!assets) return null;
    return assets.upload(file);
  }, []);

  return {
    ready,
    backend,
    tasks,
    roster,
    projects,
    updateTask,
    reorderTask,
    insertAfter,
    addComment,
    createTask,
    createTasksFromPaste,
    archiveTask,
    addPerson,
    updatePersonCapacity,
    createProject,
    archiveProject,
    uploadAttachment,
  };
}
