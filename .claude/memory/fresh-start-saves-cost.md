# Start agents fresh at task boundaries
Resuming long-running agents re-reads their whole history on every turn: about $4 for a quick review.
A fresh start with a self-contained brief cost $0.29 for a Sonnet build and $0.47 for an Opus review (#45, 2026-10-08).
Default: a fresh agent per task, with the seat name kept. Resume only within a task, for fixes on the same PR.
