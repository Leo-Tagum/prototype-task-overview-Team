import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_META, SIZE_META, STATUS_META, STATUS_ORDER } from "@/types";
import type { Person, Priority, Size, Status } from "@/types";
import type { PasteDefaults } from "@/lib/store";

export function PasteIntake({
  roster,
  onSubmit,
}: {
  roster: Person[];
  onSubmit: (titles: string[], defaults: PasteDefaults) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [status, setStatus] = useState<Status>("not_started");
  const [size, setSize] = useState<Size>("M");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const titles = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function handleSubmit() {
    if (!titles.length) return;
    setSubmitting(true);
    try {
      await onSubmit(titles, { priority, status, size, assigneeId });
      setText("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          Paste tasks
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Paste tasks</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          One task title per line. They're created in the order you paste them — that order is the
          project's shared sequence, visible to everyone.
        </p>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Confirm venue\nSend contract to vendor\nBook catering"}
          rows={8}
          className="font-mono-data text-sm"
        />

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Priority</label>
            <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v) as Priority)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
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
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
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
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Size</label>
            <Select value={size} onValueChange={(v) => setSize(v as Size)}>
              <SelectTrigger className="h-8 text-xs">
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
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Assignee (optional)</label>
          <Select value={assigneeId ?? "unassigned"} onValueChange={(v) => setAssigneeId(v === "unassigned" ? null : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
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

        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">
            {titles.length} task{titles.length === 1 ? "" : "s"}
          </span>
          <Button onClick={handleSubmit} disabled={!titles.length || submitting}>
            {submitting ? "Creating…" : `Create ${titles.length || ""} task${titles.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
