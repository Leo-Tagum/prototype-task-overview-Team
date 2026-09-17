# Task Tracker

## What this is

A shared team task tracker, built as a **Claude Artifact** (a React app
bundled to one self-contained HTML file, published via claude.ai — no
hosting, no login, no server you run). Data lives in the artifact's own
`db` capability and every viewer sees the same live board.

It's the team successor to a personal planner called **Waypoint** (same
build approach: `artifacts-builder` skill, Parcel bundle, single-file
publish). Every feature past the original core request was added
incrementally in response to real usage — read the git log; commit
messages explain *why*, not just what, for nearly every change.

**Live artifact:** https://claude.ai/artifact/KWW97bFpU9LtdUphLnDf3S
**Repo / branch:** `Leo-Tagum/prototype-task-overview-Team`, branch
`claude/eager-goodall-3fem1y`

## Who it's for

Two audiences, deliberately different screens:
- **The team** — List, Board, Briefing, Calendar, Workload tabs. Paste in
  tasks, move them through status, write a plain-language brief on what
  each one is.
- **The business owner** ("boss", referred to as Juan/the reader in
  various requests) — the **Overview** tab exists entirely for them: a
  three-sentence computed brief, headline tiles, what needs attention, an
  embedded calendar, and the Roadmap (phase-based plan view). They have no
  project context and shouldn't need any to understand where things stand.

## Before you touch anything

Read `SETUP.md` for the local dev and publish workflow — you cannot skip
the bundle → transform → publish steps, and there are two build tweaks
(`package.json` alias, `tsconfig.app.json` ignoreDeprecations) that Parcel
needs to build at all.

## Hard-won rules — don't relearn these the expensive way

1. **Every schema addition needs a `normalize*` backfill, applied at every
   read site.** The `db` store has *live user data* from before this
   session existed. A field added to `Task` or `Project` after data
   already exists (`brief`, `phaseId`, `goal`, `goalWhy` all hit this)
   is simply *absent* on old docs — not `undefined` in a safe way,
   literally missing. Code that assumes it exists (`task.brief.trim()`)
   crashes the whole page white/blank for every existing user, with no
   error boundary to catch it. This happened twice. See `normalizeTask`
   and `normalizeProject` in `src/lib/store.ts` — every read path (cloud
   snapshot, localStorage fallback, single-doc `getFreshTask`) funnels
   through them. **Any new field on an existing entity needs the same
   treatment**, or reproduce the crash locally first (seed localStorage
   with old-shape JSON, as done in this project's testing) before you
   trust it's safe.

2. **`window.confirm` / `alert` / `prompt` silently no-op inside the
   Artifact's sandboxed iframe.** No dialog, no error, the code just
   doesn't proceed — reads exactly like a dead button. Use an in-page
   confirmation instead (`src/components/ConfirmDialog.tsx`, built on the
   shadcn `Dialog`).

3. **Computed status, never stored status.** Phase status
   (done/in_progress/not_started, `src/lib/phases.ts`), task risk flags,
   project risk, the Quick Brief's every claim — all derived live from the
   activity log / task state, on every read. A manually-set flag or cached
   percentage goes stale and nobody notices until it's actively
   misleading. If you're tempted to store a status or a percentage,
   don't — derive it.

4. **The Overview "Quick brief" (`src/lib/brief.ts`) is template
   interpolation, not a model call.** It must render instantly and can
   never assert something the underlying data doesn't support. New
   situations get a new template branch, never a summarization call.

5. **Concurrent edits use a best-effort `acquire()` lease**
   (`withTaskLease` in `store.ts`), not a real lock — the `db` capability
   is last-writer-wins with no transactions. This only coordinates writers
   that are all *this app's own code* cooperating; it's not a security
   boundary. Field-level `update()` merges (not `set()` full-doc replace)
   are what actually keep concurrent edits to different fields from
   clobbering each other.

6. **Identity is attribution, not authentication.** Whoever picks a name
   from the roster (or types a new one) writes to the shared board as
   that person — anyone with the artifact link can claim anyone's name.
   This is intentional for a small team on a shared link (see
   `src/lib/identity.ts`); don't "fix" it into a login system without
   being asked.

7. **`InitialsAvatar` (`src/components/ui-bits.tsx`) computes its label
   from the name at render time**, not from a stored `initials` field. A
   one-word name ("Leo") shows in full rather than collapsing to a single
   ambiguous letter. Don't reintroduce a stored/cached initials field.

8. **No hover-only reveals for anything a viewer needs to act on or
   read to understand status** — hover doesn't exist on touch devices.
   The calendar's day-cell `HoverCard` is an explicit, deliberate
   exception the user asked for after trying the alternative (cramming
   full detail into the grid) and finding it too dense; clicking a day
   still works independently of hover. Don't extend the hover-only
   pattern elsewhere without the same explicit ask.

9. **Blue is reserved for "this is selected", never a status color.**
   The Roadmap rail's left border is the one place blue appears, and
   status dots there use a fixed green/amber/grey vocabulary distinct
   from the 5-way task-status palette used everywhere else (task
   `in_progress` is teal, not amber — phase `in_progress` reuses the
   `blocked` token's amber purely for its color, see the comment in
   `RoadmapPanel.tsx`). Don't conflate the two palettes.

## Data model (`src/types.ts`)

- **Person** — roster entry; `capacityPoints` for the workload reference
  line.
- **Project** — `goal`/`goalWhy` for the Roadmap's goal line,
  `closeTarget` for at-risk rules.
- **Phase** — outcome-named (not activity-named) grouping of tasks within
  a project; status always derived, never stored.
- **Task** — the core entity. `phaseId` links it to a Phase (nullable —
  shows as "Unphased" on the Roadmap). `brief` is the team-written
  plain-language summary (Briefing tab + Overview's "From the team").
  `activity` is auto-appended by `mergeTaskPatch` in `store.ts` — never
  push to it directly from a component.

## Where things live

- `src/lib/store.ts` — the `db`-capability backend + localStorage
  fallback. The single merge/patch path for tasks
  (`mergeTaskPatch`) is what keeps the activity log and `completedAt`
  correct no matter which component calls `updateTask`.
- `src/lib/metrics.ts` — KPI and at-risk derivations, one exported
  threshold constant (`RISK_THRESHOLDS` in `types.ts`) to tune later.
- `src/lib/phases.ts` — Roadmap's phase-status/current-phase derivations.
- `src/lib/brief.ts` — Overview's Quick Brief sentence templates.
- `src/components/RoadmapPanel.tsx` — the Roadmap section (rail + main
  panel); reads real spec constraints (blue = selection only, no second
  list of phase steps, etc.) — re-read them before changing it.
- `src/components/Overview.tsx` — assembles Quick Brief, tiles, Needs
  attention, embedded Calendar, Roadmap (or the "Deals in flight"
  fallback when a project has no phases yet), weekly trend.
- `src/components/TaskEditor.tsx` — the task drawer; every task field is
  editable here, including fields other views only show read-only.

## Testing conventions used throughout this project

There's no test framework installed — verification has been: `pnpm exec
tsc -b`, `pnpm run lint`, then a live `pnpm run dev` session driven with
Playwright (global install at `/opt/node22/lib/node_modules/playwright`,
launched with `executablePath: '/opt/pw-browsers/chromium'`) to exercise
the actual flow and screenshot the result before shipping. For any schema
change, also reproduce old-shape data in `localStorage` first (see rule 1
above) rather than assuming normalization is correct.
