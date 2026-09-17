import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InitialsAvatar, PriorityBadge, StatusBadge } from "@/components/ui-bits";
import { PRIORITY_META, SIZE_META, STATUS_META, STATUS_ORDER } from "@/types";
import type { ActivityEntry, Person, Phase, Priority, Size, Status, Task } from "@/types";

function describeActivityEntry(entry: ActivityEntry, roster: Person[]): string {
  const actor = roster.find((p) => p.id === entry.actorId)?.name ?? "Someone";
  if (entry.field === "created") return `${actor} created this task`;
  const label: Record<string, string> = {
    status: "status",
    assigneeId: "assignee",
    dueDate: "due date",
    priority: "priority",
    size: "size",
  };
  const fmt = (v: string | number | null, field: string) => {
    if (v === null) return field === "assigneeId" ? "Unassigned" : "—";
    if (field === "status") return STATUS_META[v as Status]?.label ?? String(v);
    if (field === "priority") return `P${v} ${PRIORITY_META[v as Priority]?.label ?? ""}`;
    if (field === "assigneeId") return roster.find((p) => p.id === v)?.name ?? "Someone";
    return String(v);
  };
  return `${actor} changed ${label[entry.field]} from ${fmt(entry.from, entry.field)} to ${fmt(entry.to, entry.field)}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function renderWithMentions(body: string) {
  const parts = body.split(/(@[A-Za-z][\w.'-]*(?:\s[A-Za-z][\w.'-]*)?)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded-sm bg-primary/10 px-1 font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TaskEditor({
  open,
  onOpenChange,
  task,
  siblings,
  phases,
  roster,
  onUpdate,
  onArchive,
  onAddComment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  /** All non-archived tasks in the same project, for the "blocked by" picker. */
  siblings: Task[];
  /** This task's project's phases, position-ordered. */
  phases: Phase[];
  roster: Person[];
  onUpdate: (patch: Partial<Task>) => void;
  onArchive: () => void;
  onAddComment: (body: string) => void;
}) {
  const [titleDraft, setTitleDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [briefDraft, setBriefDraft] = useState("");
  const [titleDirty, setTitleDirty] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const [briefDirty, setBriefDirty] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [openedUpdatedAt, setOpenedUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    // Intentionally keyed on [open, task?.id] only: this resets the drafts
    // when a *different* task opens, not on every live update to the one
    // already open — otherwise an incoming external change would clobber
    // whatever the viewer is mid-typing.
    if (open && task) {
      setTitleDraft(task.title);
      setNotesDraft(task.notes);
      setBriefDraft(task.brief);
      setTitleDirty(false);
      setNotesDirty(false);
      setBriefDirty(false);
      setCommentText("");
      setOpenedUpdatedAt(task.updatedAt);
    }
  }, [open, task?.id]);

  const externallyChanged =
    !!task && !!openedUpdatedAt && task.updatedAt !== openedUpdatedAt && (titleDirty || notesDirty || briefDirty);

  const assignee = useMemo(() => roster.find((p) => p.id === task?.assigneeId) ?? null, [roster, task]);
  const activitySorted = useMemo(
    () => (task ? [...task.activity].sort((a, b) => (a.at < b.at ? 1 : -1)) : []),
    [task],
  );
  const commentsSorted = useMemo(
    () => (task ? [...task.comments].sort((a, b) => (a.at < b.at ? 1 : -1)) : []),
    [task],
  );

  if (!task) return null;

  function reloadFromServer() {
    setTitleDraft(task!.title);
    setNotesDraft(task!.notes);
    setBriefDraft(task!.brief);
    setTitleDirty(false);
    setNotesDirty(false);
    setBriefDirty(false);
    setOpenedUpdatedAt(task!.updatedAt);
  }

  function commitTitle() {
    if (titleDirty && titleDraft.trim()) onUpdate({ title: titleDraft.trim() });
    setTitleDirty(false);
    setOpenedUpdatedAt(task!.updatedAt);
  }
  function commitNotes() {
    if (notesDirty) onUpdate({ notes: notesDraft });
    setNotesDirty(false);
    setOpenedUpdatedAt(task!.updatedAt);
  }
  function commitBrief() {
    if (briefDirty) onUpdate({ brief: briefDraft });
    setBriefDirty(false);
    setOpenedUpdatedAt(task!.updatedAt);
  }

  function postComment() {
    const body = commentText.trim();
    if (!body) return;
    onAddComment(body);
    setCommentText("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="font-display text-xl">Task</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          {externallyChanged && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-status-blocked/40 bg-status-blocked/10 px-3 py-2 text-xs">
              <span>Someone updated this task while you were editing.</span>
              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={reloadFromServer}>
                Reload
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={titleDraft}
                onChange={(e) => {
                  setTitleDraft(e.target.value);
                  setTitleDirty(true);
                }}
                onBlur={commitTitle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea
                id="task-notes"
                value={notesDraft}
                onChange={(e) => {
                  setNotesDraft(e.target.value);
                  setNotesDirty(true);
                }}
                onBlur={commitNotes}
                placeholder="Context, links…"
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-brief">Brief</Label>
              <p className="text-xs text-muted-foreground">
                What this task is, why it matters, and where it's headed — plain language for anyone outside the
                team. Shown on the Briefing tab.
              </p>
              <Textarea
                id="task-brief"
                value={briefDraft}
                onChange={(e) => {
                  setBriefDraft(e.target.value);
                  setBriefDirty(true);
                }}
                onBlur={commitBrief}
                placeholder="e.g. Confirming the venue so catering can lock numbers — waiting on their reply."
                rows={3}
              />
            </div>
          </div>

          {phases.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Phase</Label>
              <Select
                value={task.phaseId ?? "none"}
                onValueChange={(v) => onUpdate({ phaseId: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unphased</SelectItem>
                  {phases.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select value={String(task.priority)} onValueChange={(v) => onUpdate({ priority: Number(v) as Priority })}>
                <SelectTrigger>
                  <SelectValue>
                    <PriorityBadge priority={task.priority} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {([5, 4, 3, 2, 1] as Priority[]).map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      P{p} {PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={task.status} onValueChange={(v) => onUpdate({ status: v as Status })}>
                <SelectTrigger>
                  <SelectValue>
                    <StatusBadge status={task.status} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Size</Label>
              <Select value={task.size} onValueChange={(v) => onUpdate({ size: v as Size })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["S", "M", "L"] as Size[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} · {SIZE_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <Select value={task.assigneeId ?? "unassigned"} onValueChange={(v) => onUpdate({ assigneeId: v === "unassigned" ? null : v })}>
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <InitialsAvatar person={assignee} size={18} />
                      {assignee?.name ?? "Unassigned"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {roster.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-date">Due date</Label>
            <Input
              id="task-date"
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
            />
          </div>

          {task.status === "blocked" && (
            <div className="flex flex-col gap-2 rounded-md border border-status-blocked/40 bg-status-blocked/5 p-3">
              <Label>Blocked on</Label>
              <Select
                value={task.blockedOn?.taskId ?? "none"}
                onValueChange={(v) =>
                  onUpdate({ blockedOn: { ...(task.blockedOn ?? {}), taskId: v === "none" ? undefined : v } })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Linked task (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked task</SelectItem>
                  {siblings
                    .filter((t) => t.id !== task.id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                value={task.blockedOn?.reason ?? ""}
                onChange={(e) => onUpdate({ blockedOn: { ...(task.blockedOn ?? {}), reason: e.target.value || undefined } })}
                placeholder="Reason (e.g. waiting on design sign-off)"
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Activity</Label>
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-secondary/20 p-2.5">
              {activitySorted.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
              {activitySorted.map((e) => (
                <div key={e.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{describeActivityEntry(e, roster)}</span>
                  <span className="shrink-0 font-mono-data text-[10px] text-muted-foreground/70">{timeAgo(e.at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Comments</Label>
            <div className="flex flex-col gap-2">
              {commentsSorted.map((c) => (
                <div key={c.id} className="rounded-sm border border-border bg-secondary/30 px-2.5 py-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{roster.find((p) => p.id === c.authorId)?.name ?? "Someone"}</span>
                    <span className="font-mono-data text-[10px] text-muted-foreground">{timeAgo(c.at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{renderWithMentions(c.body)}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave an update… use @Name to mention someone"
                rows={2}
                className="text-sm"
              />
              <Button type="button" variant="outline" size="sm" className="h-auto shrink-0" onClick={postComment}>
                Post
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row justify-between gap-2 border-t border-border px-5 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              onArchive();
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Archive
          </Button>
          <SheetClose asChild>
            <Button type="button">Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
