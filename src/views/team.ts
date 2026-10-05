import { ordinalChart } from "../charts";
import type { Dataset } from "../model";
import { FINISHES, activeTeams, finish, involves, record, teamSummary } from "../stats";
import { FOCUS, esc, matchTable, teamName } from "../ui";

export function teamSelect(ds: Dataset, current: string, id: string, label: string): string {
  const opts = activeTeams(ds).length ? activeTeams(ds) : [...ds.teams.keys()];
  return `<label>${esc(label)}<select id="${id}">${opts
    .map((c) => `<option value="${esc(c)}" ${c === current ? "selected" : ""}>${esc(ds.teams.get(c)?.flag ?? "")} ${esc(teamName(ds, c))}</option>`)
    .join("")}</select></label>`;
}

export function team(ds: Dataset, codeParam?: string): string {
  const code = codeParam && ds.teams.has(codeParam) ? codeParam : FOCUS;
  const t = ds.teams.get(code)!;
  const s = teamSummary(ds, code);
  const ms = ds.matches.filter((m) => involves(m, code));
  const held = ds.editions.filter((e) => e.status === "completed");

  const tiles = `<div class="tiles">
    <div class="tile"><div class="k">Titles</div><div class="v">${s.titles}</div></div>
    <div class="tile"><div class="k">Finals appearances</div><div class="v">${s.appearances}</div><div class="s">of ${held.length} editions</div></div>
    <div class="tile"><div class="k">Best finish</div><div class="v" style="font-size:20px">${s.best ?? "—"}</div></div>
    <div class="tile"><div class="k">Finals W-D-L</div><div class="v" style="font-size:20px">${s.finals.w}-${s.finals.d}-${s.finals.l}</div><div class="s">GF ${s.finals.gf} · GA ${s.finals.ga}</div></div>
    <div class="tile"><div class="k">Qualifiers W-D-L</div><div class="v" style="font-size:20px">${s.qualifying.w}-${s.qualifying.d}-${s.qualifying.l}</div><div class="s">GF ${s.qualifying.gf} · GA ${s.qualifying.ga}</div></div>
  </div>`;

  const levels = FINISHES.filter((f) => f !== "Did not enter");
  const points = held.map((e) => {
    const f = finish(ds, e, code);
    const lvl = f && f !== "Did not enter" ? levels.indexOf(f) : undefined;
    return { x: String(e.year), y: lvl, tip: `${e.year}: ${f ?? "—"}` };
  });
  const chart = `<div class="card"><h2>Finish by edition</h2>${ordinalChart(points, levels, { title: `${t.name} finish at each edition` })}
    <p class="small muted" style="margin:6px 0 0">No dot = did not enter, or no data yet for that edition.</p></div>`;

  const byYear = held
    .map((e) => {
      const ym = ms.filter((m) => m.year === e.year);
      const q = record(ym.filter((m) => m.phase === "qualifying"), code);
      const f = record(ym.filter((m) => m.phase === "final"), code);
      const fin = finish(ds, e, code);
      if (!ym.length && (!fin || fin === "Did not enter")) return "";
      const cell = (r: typeof q) => (r.p ? `${r.w}-${r.d}-${r.l} <span class="muted small">(${r.gf}:${r.ga})</span>` : `<span class="muted">—</span>`);
      return `<tr><td><a href="#/edition/${e.year}">${e.year}</a></td><td>${cell(q)}</td><td>${cell(f)}</td><td>${esc(fin ?? "")}</td></tr>`;
    })
    .join("");

  return `<div class="filters">${teamSelect(ds, code, "team-pick", "Team")}</div>
    <h1><span class="flag">${esc(t.flag)}</span>${esc(t.name)}</h1>
    <p class="lede">${t.formerNames.length ? `Also listed as ${esc(t.formerNames.join(", "))}. ` : ""}<a href="#/h2h/${code}/${code === "JPN" ? "PRK" : "JPN"}">Head-to-head →</a></p>
    ${tiles}
    <div class="grid cols-2">${chart}<div class="card"><h2>By edition</h2>${
      byYear
        ? `<div class="table-wrap"><table><thead><tr><th>Year</th><th>Qualifiers W-D-L</th><th>Finals W-D-L</th><th>Finish</th></tr></thead><tbody>${byYear}</tbody></table></div>`
        : `<div class="empty">No results yet.</div>`
    }</div></div>
    <div class="card"><h2>All matches <span class="muted small">(${ms.length})</span></h2>${matchTable(ds, [...ms].reverse(), { perspective: code })}</div>`;
}
