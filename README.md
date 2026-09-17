# Task Tracker

A shared team task tracker: a calendar of all tasks with owners and
deadlines, a status board showing what everyone's currently on, and
priority 1–5 (5 = urgent, today; 1 = nice to have). Built as a claude.ai
Artifact — no hosting, no login, data lives in the artifact's own storage
and every viewer sees the same live board.

Beyond the core calendar/board, it adds what a team needs to actually
coordinate: ordered paste-to-create intake (hand down a list, it keeps the
order), a status field independent of priority, an auto-logged activity
history per task, @mention comments, and workload/KPI views computed
entirely from that history — no one fills in a "how's it going" field by
hand.

See `SETUP.md` for local development and the publish workflow.
