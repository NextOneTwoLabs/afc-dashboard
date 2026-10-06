import { ordinalChart } from "../charts";
import type { Dataset } from "../model";
import { FINISHES, activeTeams, biggestWins, finish, involves, outcome, record, teamSummary, unbeatenRuns } from "../stats";
import { FOCUS, esc, fmtDate, matchTable, teamLink, teamName } from "../ui";

export function teamSelect(ds: Dataset, current: string, id: string, label: string, opts: { blank?: boolean; exclude?: string } = {}): string {
  const active = activeTeams(ds).length ? activeTeams(ds) : [...ds.teams.keys()];
  // Always list the team being viewed, even one with no matches or podium place yet.
  const all = current && ds.teams.has(current) && !active.includes(current) ? [...active, current] : active;
  const codes = all
    .filter((c) => c !== opts.exclude)
    .sort((a, b) => teamName(ds, a).localeCompare(teamName(ds, b)));
  return `<label>${esc(label)}<select id="${id}">${opts.blank ? `<option value="" ${current ? "" : "selected"}>—</option>` : ""}${codes
    .map((c) => `<option value="${esc(c)}" ${c === current ? "selected" : ""}>${esc(ds.teams.get(c)?.flag ?? "")} ${esc(teamName(ds, c))}</option>`)
    .join("")}</select></label>`;
}

/** The team's record against one opponent (the former Head-to-head tab). */
function comparison(ds: Dataset, a: string, b: string): string {
  const ms = ds.matches.filter((m) => involves(m, a) && involves(m, b));
  const r = record(ms, a);
  const pct = (n: number) => (r.p ? (100 * n) / r.p : 0);
  const bar = r.p
    ? `<div class="wdl" role="img" aria-label="${r.w} wins, ${r.d} draws, ${r.l} losses">
        <span style="width:${pct(r.w)}%;background:var(--win)"></span><span style="width:${pct(r.d)}%;background:var(--draw)"></span><span style="width:${pct(r.l)}%;background:var(--loss)"></span></div>
       <div class="legend"><span><i style="background:var(--win)"></i>${esc(teamName(ds, a))} wins ${r.w}</span><span><i style="background:var(--draw)"></i>Draws ${r.d}</span><span><i style="background:var(--loss)"></i>${esc(teamName(ds, b))} wins ${r.l}</span></div>`
    : `<div class="empty">These teams haven't met${ds.matches.length ? "" : " (match data not loaded yet)"}.</div>`;
  return `<div class="card" id="compare"><div class="card-head"><h2>${teamLink(ds, a)} <span class="muted">compared with</span> ${teamLink(ds, b)}</h2><span class="muted small">${r.p} meetings · goals ${r.gf}–${r.ga}</span></div>
    ${bar}${ms.length ? `<h3 style="margin-top:14px">Meetings</h3>${matchTable(ds, [...ms].reverse(), { perspective: a })}` : ""}</div>`;
}

export function team(ds: Dataset, codeParam?: string, oppParam?: string): string {
  const code = codeParam && ds.teams.has(codeParam) ? codeParam : FOCUS;
  const opp = oppParam && ds.teams.has(oppParam) && oppParam !== code ? oppParam : undefined;
  const t = ds.teams.get(code)!;
  const s = teamSummary(ds, code);
  const ms = ds.matches.filter((m) => involves(m, code));
  const held = ds.editions.filter((e) => e.status === "completed");
  const [run] = unbeatenRuns(ms, [code], 1);

  const tiles = `<div class="tiles">
    <div class="tile"><div class="k">Titles</div><div class="v">${s.titles}</div></div>
    <div class="tile"><div class="k">Finals appearances</div><div class="v">${s.appearances}</div><div class="s">of ${held.length} editions</div></div>
    <div class="tile"><div class="k">Best finish</div><div class="v" style="font-size:20px">${s.best ?? "—"}</div></div>
    <div class="tile"><div class="k">Finals W-D-L</div><div class="v" style="font-size:20px">${s.finals.w}-${s.finals.d}-${s.finals.l}</div><div class="s">GF ${s.finals.gf} · GA ${s.finals.ga}</div></div>
    <div class="tile"><div class="k">Qualifiers W-D-L</div><div class="v" style="font-size:20px">${s.qualifying.w}-${s.qualifying.d}-${s.qualifying.l}</div><div class="s">GF ${s.qualifying.gf} · GA ${s.qualifying.ga}</div></div>
    <div class="tile"><div class="k">Longest unbeaten run</div><div class="v" style="font-size:20px">${run ? run.length : "—"}</div>${
      run ? `<div class="s">${esc(fmtDate(run.from.date))} – ${run.ongoing ? "latest match" : esc(fmtDate(run.to.date))}</div>` : ""
    }</div>
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
      return `<tr><td><a href="#/events/${e.year}">${e.year}</a></td><td>${cell(q)}</td><td>${cell(f)}</td><td>${esc(fin ?? "")}</td></tr>`;
    })
    .join("");

  const wins = ms.filter((m) => outcome(m, code) === "W");
  const winsCard = `<div class="card"><h2>Biggest wins</h2>${
    wins.length ? matchTable(ds, biggestWins(wins, 5), { perspective: code }) : `<div class="empty">No wins in the data yet.</div>`
  }</div>`;

  return `<div class="filters">${teamSelect(ds, code, "team-pick", "Team")}${teamSelect(ds, opp ?? "", "compare-pick", "Compare with…", { blank: true, exclude: code })}</div>
    <h1><span class="flag">${esc(t.flag)}</span>${esc(t.name)}</h1>
    <p class="lede">Record, finishes and results across every edition.${t.formerNames.length ? ` Also listed as ${esc(t.formerNames.join(", "))}.` : ""}</p>
    ${tiles}
    ${opp ? comparison(ds, code, opp) : ""}
    <div class="grid cols-2">${chart}<div class="card"><h2>By edition</h2>${
      byYear
        ? `<div class="table-wrap"><table><thead><tr><th>Year</th><th>Qualifiers W-D-L</th><th>Finals W-D-L</th><th>Finish</th></tr></thead><tbody>${byYear}</tbody></table></div>`
        : `<div class="empty">No results yet.</div>`
    }</div></div>
    <div class="grid cols-2">${winsCard}</div>
    <div class="card"><h2>All matches <span class="muted small">(${ms.length})</span></h2>${matchTable(ds, [...ms].reverse(), { perspective: code })}</div>`;
}
