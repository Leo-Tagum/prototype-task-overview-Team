import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export function NewPhaseDialog({
  onCreate,
}: {
  onCreate: (name: string, why: string, targetMonth: string | null) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [targetMonth, setTargetMonth] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim(), why.trim(), targetMonth || null);
      setName("");
      setWhy("");
      setTargetMonth("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          + Phase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">New phase</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Name it as an outcome, not an activity — "Get talked about where sellers ask for advice," not "Reddit
          posting."
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phase-name">Phase</Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get talked about where sellers ask for advice"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phase-why">Why it matters</Label>
            <Input
              id="phase-why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="One short line for the business owner"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phase-month">Target month (optional)</Label>
            <Input id="phase-month" type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || submitting}>
            {submitting ? "Adding…" : "Add phase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
