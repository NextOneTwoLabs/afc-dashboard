import type { Dataset, Match } from "../model";
import { activeTeams, biggestWins, highestScoring, unbeatenRuns } from "../stats";
import { FOCUS, emptyData, esc, fmtDate, matchTable, teamLink } from "../ui";

export function records(ds: Dataset): string {
  if (!ds.matches.length) return `<h1>Records</h1>${emptyData()}`;
  const finals = ds.matches.filter((m) => m.phase === "final");
  const runs = unbeatenRuns(ds.matches, activeTeams(ds));
  const hkMatches = ds.matches.filter((m) => m.home === FOCUS || m.away === FOCUS);
  const hkWins = hkMatches.filter((m) => (m.home === FOCUS ? m.hs > m.as : m.as > m.hs));

  const tbl = (title: string, ms: Match[]) => `<div class="card"><h2>${esc(title)}</h2>${matchTable(ds, ms)}</div>`;

  const runRows = runs
    .map(
      (r) => `<tr class="${r.team === FOCUS ? "hk" : ""}"><td>${teamLink(ds, r.team)}</td><td class="num"><strong>${r.length}</strong></td>
        <td class="small">${esc(fmtDate(r.from.date))} – ${r.ongoing ? "ongoing" : esc(fmtDate(r.to.date))}</td></tr>`,
    )
    .join("");

  return `<h1>Records</h1>
    <p class="lede">Shoot-out results count as draws. Unbeaten runs span qualifiers and finals.</p>
    ${tbl("Biggest wins — all matches", biggestWins(ds.matches))}
    ${tbl("Biggest wins — final tournaments", biggestWins(finals, 5))}
    ${tbl("Highest-scoring matches", highestScoring(ds.matches))}
    <div class="grid cols-2">
      <div class="card"><h2>Longest unbeaten runs</h2><div class="table-wrap"><table><thead><tr><th>Team</th><th class="num">Matches</th><th>Span</th></tr></thead><tbody>${runRows}</tbody></table></div></div>
      ${hkWins.length ? tbl(`Hong Kong's biggest wins`, biggestWins(hkWins, 5)) : `<div class="card"><h2>Hong Kong's biggest wins</h2><div class="empty">No wins in the data yet.</div></div>`}
    </div>`;
}
