# Report tokens and dollar cost for every PR (owner, 2026-10-08)
Owner: "moving forward, for every PR, report token usage and dollar cost."
How: run `.claude/tools/pr-cost.py` on the agent transcripts in the session folder (subagents/agent-*.jsonl); it sums usage per brief.
Map the briefs to PRs (build + fixes + reviews). Prices are from the claude-api skill: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, cache read $0.20, writes 1.25x (5m) / 2x (1h) of input.
Caveats: transcripts record output_tokens only at stream start, so output is estimated from visible text; hidden thinking isn't counted, so these are low estimates.
TPM coordination is reported separately.
Owner (2026-10-08): "you should put cost in the PR (and here for reference)".
So: post a cost table as a PR comment before listing the PR as ready, and repeat it in the report to the owner.
