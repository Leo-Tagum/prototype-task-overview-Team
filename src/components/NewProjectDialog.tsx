import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export function NewProjectForm({
  onCreate,
  submitLabel = "Create project",
}: {
  onCreate: (name: string, closeTarget: string | null) => Promise<unknown>;
  submitLabel?: string;
}) {
  const [name, setName] = useState("");
  const [closeTarget, setCloseTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim(), closeTarget || null);
      setName("");
      setCloseTarget("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme onboarding" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-close">Close target (optional)</Label>
        <Input id="project-close" type="date" value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={!name.trim() || submitting}>
        {submitting ? "Creating…" : submitLabel}
      </Button>
    </div>
  );
}

export function NewProjectDialog({ onCreate }: { onCreate: (name: string, closeTarget: string | null) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          + New project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">New project</DialogTitle>
        </DialogHeader>
        <NewProjectForm
          onCreate={async (name, closeTarget) => {
            await onCreate(name, closeTarget);
            setOpen(false);
          }}
        />
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
