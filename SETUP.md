# Task Tracker — build & publish

A team task tracker built as a claude.ai Artifact (calendar, priority 1–5,
a status Kanban board, a Roadmap/phase plan view, workload and KPI
views — synced via the artifact's own `db`/`assets` capabilities, not a
server you host). This is the team successor to a personal planner
called Waypoint, built the same way.

**Read `CLAUDE.md` first** — it has the project's hard-won rules (schema
backfill, the `window.confirm` sandbox trap, computed-never-stored status,
etc.) that this file doesn't repeat.

## Local development

```bash
pnpm install
pnpm dev
```

Opens on Vite's dev server. `window.claude` isn't present outside a
published artifact, so the store falls back to `localStorage` — everything
works except cross-viewer sync, which only exists once published.

`pnpm exec tsc -b` type-checks; `pnpm run lint` runs oxlint.

## Publishing (or re-publishing after changes)

1. `bash .agents/skills/artifacts-builder/scripts/bundle-artifact.sh`
   — installs Parcel + html-inline, builds, and inlines everything into a
   single `bundle.html` at the repo root. Two build tweaks this depends on
   are already in place: the `alias` entry in `package.json` (Radix's
   `is-development` subpath, which Parcel can't resolve without it) and
   `ignoreDeprecations` in `tsconfig.app.json`.
2. `python3 scripts/prepare-artifact.py` — strips the wrapper tags the
   Artifact tool supplies itself (`<!doctype>`, `<html>`, charset/viewport
   meta, `<body>`) and moves `<title>` plus the Google Fonts `<link>` tags
   (removed from `index.html` so the inliner wouldn't choke on their
   absolute URLs) to the front of the file. Produces `artifact.html`.
3. Publish `artifact.html` with the Artifact tool, `capabilities: {"db":
   {}, "assets": {}}` so tasks/roster/projects are shared and persistent
   rather than per-browser. Pass `url` (the existing artifact's link) to
   update in place instead of creating a new one.

Neither `bundle.html` nor `artifact.html` is committed — they're
regenerated from source, see `.gitignore`.

## Source layout

- `src/types.ts` — Person/Project/Phase/Task/ActivityEntry/TaskComment,
  the priority (1–5) and status enums, and the at-risk thresholds.
- `src/lib/store.ts` — the `db`-capability read/write backend, with a
  `localStorage` fallback. Every task field change goes through one
  merge path (`mergeTaskPatch`) so the activity log and `completedAt`
  derivation can't be skipped by a component editing fields directly.
  Concurrent edits to the same task doc are serialized with the `db`
  capability's `acquire()` lease (cooperative, not a lock — see the
  comment on `withTaskLease`). `normalizeTask`/`normalizeProject`
  backfill fields added after data already existed — see CLAUDE.md rule 1
  before adding a new field to `Task` or `Project`.
- `src/lib/identity.ts` — the per-browser "who's viewing" id (attribution,
  not authentication; stored in personal `localStorage`, never the shared
  db).
- `src/lib/metrics.ts` — every derived KPI/at-risk computation and its
  tunable thresholds, in one place.
- `src/lib/phases.ts` — Roadmap's phase-status and current-phase
  derivation (always computed from tasks, never stored).
- `src/lib/brief.ts` — Overview's "Quick brief" sentence templates
  (interpolation only, never a model call — see CLAUDE.md rule 4).
- `src/lib/lastViewed.ts` — the Board's per-viewer "N changes since you
  last looked" counter.
- `src/components/` — one file per view/major piece: `TaskList`,
  `SummaryBoard`, `BriefingBoard`, `CalendarPanel`, `RoadmapPanel`,
  `WorkloadPanel`, `KpiPanel`, `Overview`, `TaskEditor` (the task
  drawer), `PasteIntake`, `InsertAfterMenu`, `NewProjectDialog`,
  `NewPhaseDialog`, `ConfirmDialog` (in-page confirm — never
  `window.confirm`, see CLAUDE.md rule 2), `IdentityPicker`.
- `src/App.tsx` — tabs, project switcher, identity picker gate, and the
  task drawer wiring.

## Making it yours

- Swap the favicon/emoji or `description` at publish time.
- `RISK_THRESHOLDS` in `types.ts` is the one place to tune the at-risk
  rules after a couple of weeks of real use.
