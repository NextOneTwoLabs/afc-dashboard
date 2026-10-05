import type { Dataset, Phase } from "../model";
import { groups, isKnockout, standings } from "../stats";
import { FOCUS, emptyData, esc, fmtDate, matchTable, teamLink } from "../ui";

const KO_ORDER = ["Play-off", "Quarter-final", "Semi-final", "Third place", "Final"];

function phaseSection(ds: Dataset, year: number, phase: Phase): string {
  const gs = groups(ds.matches, year, phase);
  const ko = ds.matches
    .filter((m) => m.year === year && m.phase === phase && isKnockout(m))
    .sort((a, b) => KO_ORDER.indexOf(a.round) - KO_ORDER.indexOf(b.round) || a.date.localeCompare(b.date));
  if (!gs.size && !ko.length) return "";

  const tables = [...gs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ms]) => {
      const rows = standings(ms)
        .map(
          (r, i) => `<tr class="${r.team === FOCUS ? "hk" : ""}"><td class="num muted">${i + 1}</td><td>${teamLink(ds, r.team)}</td>
            <td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td>
            <td class="num hide-sm">${r.gf}</td><td class="num hide-sm">${r.ga}</td><td class="num">${r.gd > 0 ? "+" : ""}${r.gd}</td><td class="num"><strong>${r.pts}</strong></td></tr>`,
        )
        .join("");
      return `<div class="card"><h3>${esc(name)}</h3><div class="table-wrap"><table>
        <thead><tr><th class="num">#</th><th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num hide-sm">GF</th><th class="num hide-sm">GA</th><th class="num">GD</th><th class="num">Pts</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
        <details style="margin-top:8px"><summary class="small muted">Matches</summary>${matchTable(ds, ms, { showEdition: false })}</details></div>`;
    })
    .join("");

  return `<h2 style="margin-top:24px">${phase === "final" ? "Final tournament" : "Qualifying"}</h2>
    ${tables ? `<div class="grid cols-2">${tables}</div>` : ""}
    ${ko.length ? `<div class="card"><h3>Knockout</h3>${matchTable(ds, ko, { showEdition: false })}</div>` : ""}`;
}

export function edition(ds: Dataset, yearParam?: string): string {
  const eds = ds.editions;
  const ed = eds.find((e) => String(e.year) === yearParam) ?? [...eds].reverse().find((e) => e.status === "completed") ?? eds[0];
  if (!ed) return emptyData();

  const chips = `<div class="chips">${eds.map((e) => `<a class="chip" href="#/edition/${e.year}" ${e === ed ? 'aria-current="page"' : ""}>${e.year}</a>`).join("")}</div>`;
  const dates = ed.start ? `${fmtDate(ed.start)} – ${fmtDate(ed.end)}` : "Dates to be added";
  const podium =
    ed.status === "completed"
      ? `<div class="podium">
          <div><div class="k">🏆 Champion</div>${teamLink(ds, ed.champion)}</div>
          <div><div class="k">🥈 Runner-up</div>${teamLink(ds, ed.runnerUp)}</div>
          <div><div class="k">🥉 Third</div>${teamLink(ds, ed.third)}</div>
          <div><div class="k">Fourth</div>${teamLink(ds, ed.fourth)}</div></div>`
      : `<div class="empty">${ed.status === "cancelled" ? "This edition was cancelled." : "This edition hasn't been played yet."}</div>`;

  const body = phaseSection(ds, ed.year, "final") + phaseSection(ds, ed.year, "qualifying");

  return `${chips}<h1>${ed.year} ${esc(ed.name)}</h1>
    <p class="lede">U-${ed.ageLimit} · Hosted by ${esc(ed.host)} · ${esc(dates)}
      ${ed.verified ? "" : ` <span class="badge warn" title="Not yet checked against sources">unverified</span>`}
      ${ed.source ? ` · <a href="${esc(ed.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</p>
    ${ed.notes ? `<div class="banner">${esc(ed.notes)}</div>` : ""}
    <div class="card">${podium}</div>
    ${body || (ed.status === "completed" ? `<div style="margin-top:16px">${emptyData()}</div>` : "")}`;
}
