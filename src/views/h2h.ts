import type { Dataset } from "../model";
import { involves, record } from "../stats";
import { FOCUS, esc, matchTable, teamLink } from "../ui";
import { teamSelect } from "./team";

export function h2h(ds: Dataset, a = FOCUS, b = "JPN"): string {
  if (!ds.teams.has(a)) a = FOCUS;
  if (!ds.teams.has(b) || b === a) b = a === "JPN" ? "PRK" : "JPN";
  const ms = ds.matches.filter((m) => involves(m, a) && involves(m, b));
  const r = record(ms, a);

  const pct = (n: number) => (r.p ? (100 * n) / r.p : 0);
  const bar = r.p
    ? `<div class="wdl" role="img" aria-label="${r.w} wins, ${r.d} draws, ${r.l} losses">
        <span style="width:${pct(r.w)}%;background:var(--win)"></span><span style="width:${pct(r.d)}%;background:var(--draw)"></span><span style="width:${pct(r.l)}%;background:var(--loss)"></span></div>
       <div class="legend"><span><i style="background:var(--win)"></i>${esc(ds.teams.get(a)?.name)} wins ${r.w}</span><span><i style="background:var(--draw)"></i>Draws ${r.d}</span><span><i style="background:var(--loss)"></i>${esc(ds.teams.get(b)?.name)} wins ${r.l}</span></div>`
    : "";

  return `<h1>Head-to-head</h1>
    <div class="filters">${teamSelect(ds, a, "h2h-a", "Team")}<span class="muted" style="padding-bottom:8px">vs</span>${teamSelect(ds, b, "h2h-b", "Opponent")}</div>
    <div class="card"><div class="card-head"><h2>${teamLink(ds, a)} <span class="muted">vs</span> ${teamLink(ds, b)}</h2><span class="muted small">${r.p} matches · goals ${r.gf}–${r.ga}</span></div>
      ${bar || `<div class="empty">These teams haven't met${ds.matches.length ? "" : " (match data not loaded yet)"}.</div>`}</div>
    ${ms.length ? `<div class="card"><h2>Meetings</h2>${matchTable(ds, [...ms].reverse(), { perspective: a })}</div>` : ""}`;
}
