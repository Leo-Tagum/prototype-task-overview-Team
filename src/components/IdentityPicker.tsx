import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InitialsAvatar } from "@/components/ui-bits";
import type { Person } from "@/types";

/**
 * One-time "who are you?" picker. This is attribution, not
 * authentication — anyone with the artifact link can claim any name.
 * Acceptable for a small team on a shared link; see the plan's
 * "Viewer identity" section for why.
 */
export function IdentityPicker({ roster, onClaim }: { roster: Person[]; onClaim: (name: string) => void }) {
  const [newName, setNewName] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6">
        <h1 className="font-display text-xl font-semibold">Who's this?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick yourself from the team, or add your name if you're new. This just labels what you do here —
          it isn't a login, and you can switch anytime from the header.
        </p>

        {roster.length > 0 && (
          <div className="mt-4 flex flex-col gap-1.5">
            {roster.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onClaim(p.name)}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:border-primary/50 hover:bg-accent/40"
              >
                <InitialsAvatar person={p} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-1.5">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Your name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) onClaim(newName.trim());
            }}
          />
          <Button type="button" disabled={!newName.trim()} onClick={() => onClaim(newName.trim())}>
            {roster.length ? "Add me" : "Start"}
          </Button>
        </div>
      </div>
    </div>
  );
}
