import type { Dataset } from "../model";
import { involves } from "../stats";
import { FOCUS, emptyData, esc, matchTable, teamName } from "../ui";
import { activeTeams } from "../stats";

export function matches(ds: Dataset, q: URLSearchParams): string {
  if (!ds.matches.length) return `<h1>Matches</h1>${emptyData()}`;
  const year = q.get("year") ?? "";
  const phase = q.get("phase") ?? "";
  const team = q.get("team") ?? "";
  const text = (q.get("q") ?? "").toLowerCase();

  const list = ds.matches.filter(
    (m) =>
      (!year || String(m.year) === year) &&
      (!phase || m.phase === phase) &&
      (!team || involves(m, team)) &&
      (!text || [m.venue, m.round, teamName(ds, m.home), teamName(ds, m.away)].join(" ").toLowerCase().includes(text)),
  );
  const goals = list.reduce((n, m) => n + m.hs + m.as, 0);
  const years = [...new Set(ds.matches.map((m) => m.year))];
  const opt = (v: string, label: string, cur: string) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;

  return `<h1>Matches</h1>
    <form class="filters" id="match-filters">
      <label>Edition<select name="year">${opt("", "All", year)}${years.map((y) => opt(String(y), String(y), year)).join("")}</select></label>
      <label>Phase<select name="phase">${opt("", "All", phase)}${opt("final", "Finals", phase)}${opt("qualifying", "Qualifiers", phase)}</select></label>
      <label>Team<select name="team">${opt("", "All", team)}${opt(FOCUS, `★ ${teamName(ds, FOCUS)}`, team)}${activeTeams(ds).filter((t) => t !== FOCUS).map((t) => opt(t, teamName(ds, t), team)).join("")}</select></label>
      <label>Search<input type="search" name="q" value="${esc(q.get("q") ?? "")}" placeholder="Venue, stage, team"></label>
    </form>
    <p class="muted small">${list.length} matches · ${goals} goals</p>
    <div class="card">${matchTable(ds, [...list].reverse(), { perspective: team || undefined })}</div>`;
}
