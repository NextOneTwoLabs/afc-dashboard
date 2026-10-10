import { ordinalChart } from "../charts";
import { COMP, eventHref } from "../competitions";
import { COMPETITIONS, forCompetition, sameEdition, type Competition, type Dataset } from "../model";
import { FINISHES, activeTeams, biggestWins, finish, involves, outcome, record, teamSummary, unbeatenRuns, type TeamSummary } from "../stats";
import { FOCUS, compBadge, esc, flagImg, fmtDate, matchTable, pageHead, segmented, teamLink, teamName } from "../ui";

export function teamSelect(ds: Dataset, current: string, id: string, label: string, opts: { blank?: boolean; exclude?: string } = {}): string {
  const active = activeTeams(ds).length ? activeTeams(ds) : [...ds.teams.keys()];
  // Always list the team being viewed, even one with no matches or podium place yet.
  const all = current && ds.teams.has(current) && !active.includes(current) ? [...active, current] : active;
  const codes = all
    .filter((c) => c !== opts.exclude)
    .sort((a, b) => teamName(ds, a).localeCompare(teamName(ds, b)));
  return `<label>${esc(label)}<select id="${id}">${opts.blank ? `<option value="" ${current ? "" : "selected"}>—</option>` : ""}${codes
    .map((c) => `<option value="${esc(c)}" ${c === current ? "selected" : ""}>${esc(teamName(ds, c))}</option>`)
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
    ${bar}${ms.length ? `<h3 style="margin-top:14px">Meetings</h3>${matchTable(ds, [...ms].reverse(), { perspective: a, showCompetition: true })}` : ""}</div>`;
}

const wdl = (r: { p: number; w: number; d: number; l: number; gf: number; ga: number }) =>
  r.p ? `${r.w}-${r.d}-${r.l}<span class="muted small hide-sm"> (${r.gf}:${r.ga})</span>` : `<span class="muted">—</span>`;

/** One row per competition, plus a total when both are shown (owner-approved mockup, #30). */
function summary(all: Dataset, code: string, comps: Competition[]): string {
  const row = (label: string, s: TeamSummary, editions: number | undefined, strong = false) => {
    // data-label is the phone layout's visible label above each value (#31); the real headers stay in the thead.
    const td = (x: string, cls = "", lbl = "") => `<td role="cell"${cls ? ` class="${cls}"` : ""}${lbl ? ` data-label="${lbl}"` : ""}>${strong ? `<strong>${x}</strong>` : x}</td>`;
    return `<tr role="row"${strong ? ' class="total"' : ""}>${td(label, "s-comp")}${td(String(s.titles), "num", "Titles")}${td(
      `${s.appearances}${editions === undefined ? "" : ` <span class="muted small">of ${editions}</span>`}`,
      "num",
      "Finals apps",
    )}${td(s.best ?? "—", "", "Best finish")}${td(wdl(s.finals), "", "Finals")}${td(wdl(s.qualifying), "", "Qualifiers")}</tr>`;
  };
  const held = (c: Competition) => all.editions.filter((e) => e.competition === c && e.status === "completed").length;
  const rows = comps.map((c) => row(compBadge(c), teamSummary(all, code, c), held(c)));
  if (comps.length > 1) rows.push(row("Total", teamSummary(forCompetitions(all, comps), code), undefined, true));
  const h = (inner: string, cls = "") => `<th role="columnheader"${cls ? ` class="${cls}"` : ""}>${inner}</th>`;
  return `<div class="table-wrap"><table class="summary" role="table"><thead role="rowgroup"><tr role="row">${h("")}${h("Titles", "num")}${h("Finals apps", "num")}${h("Best finish")}${h(`<span class="hide-sm">Finals W-D-L</span><span class="hide-lg">Finals</span>`)}${h(`<span class="hide-sm">Qualifiers W-D-L</span><span class="hide-lg">Qual.</span>`)}</tr></thead><tbody role="rowgroup">${rows.join("")}</tbody></table></div>`;
}

/** The dataset restricted to some competitions. */
const forCompetitions = (all: Dataset, comps: Competition[]): Dataset =>
  comps.length === 1 ? forCompetition(all, comps[0]) : { ...all, editions: all.editions.filter((e) => comps.includes(e.competition)), matches: all.matches.filter((m) => comps.includes(m.competition)), draws: all.draws.filter((d) => comps.includes(d.competition)) };

/**
 * A team's page across both competitions, or one with `filter` (?c=u17 / ?c=u20): a summary by
 * competition, one finish chart per competition, By edition with a Competition column.
 */
export function team(all: Dataset, codeParam?: string, oppParam?: string, filter: Competition | "both" = "both"): string {
  // Competitions with data; a competition with no editions yet (U-20 before its data) is left out.
  const comps = filter === "both" ? COMPETITIONS.filter((c) => all.editions.some((e) => e.competition === c)) : [filter];
  const ds = forCompetitions(all, comps.length ? comps : ["U17"]);
  const code = codeParam && ds.teams.has(codeParam) ? codeParam : FOCUS;
  const opp = oppParam && ds.teams.has(oppParam) && oppParam !== code ? oppParam : undefined;
  const t = ds.teams.get(code)!;
  const ms = ds.matches.filter((m) => involves(m, code));
  const [run] = unbeatenRuns(ms, [code], 1);
  const both = comps.length > 1;

  const base = `#/team/${code}${opp ? `/vs/${opp}` : ""}`;
  const filterNav = `<label>Competition${segmented("Competition", [
    { label: "Both", href: base, current: filter === "both" },
    ...COMPETITIONS.map((c) => ({ label: COMP[c].label, href: `${base}?c=${COMP[c].slug}`, current: filter === c })),
  ])}</label>`;

  const runLine = `<p class="small muted" style="margin:8px 0 0">Longest unbeaten run: ${
    run ? `${run.length} matches, ${esc(fmtDate(run.from.date))} – ${run.ongoing ? "latest match" : esc(fmtDate(run.to.date))}` : "—"
  }.</p>`;
  const summaryCard = `<div class="card"><h2>Summary by competition</h2>${summary(all, code, comps.length ? comps : ["U17"])}${runLine}</div>`;

  const levels = FINISHES.filter((f) => f !== "Did not enter");
  const charts = (comps.length ? comps : (["U17"] as Competition[]))
    .map((c) => {
      const held = ds.editions.filter((e) => e.competition === c && e.status === "completed");
      const points = held.map((e) => {
        const f = finish(ds, e, code);
        const lvl = f && f !== "Did not enter" ? levels.indexOf(f) : undefined;
        return { x: String(e.year), y: lvl, tip: `${COMP[c].label} ${e.year}: ${f ?? "—"}` };
      });
      return `<div class="card"><h2>Finish by edition · ${compBadge(c)}</h2>${ordinalChart(points, levels, { title: `${t.name} finish at each ${COMP[c].label} edition` })}
    <p class="small muted" style="margin:6px 0 0">No dot = did not enter, or no data yet for that edition.</p></div>`;
    })
    .join("");

  // Completed editions, plus any other edition the team has played in (e.g. qualifiers under way),
  // so every match counted in the summary has a row here. By year, U-17 first within a year.
  const byYear = ds.editions
    .filter((e) => e.status === "completed" || ms.some((m) => sameEdition(m, e)))
    .map((e) => {
      const ym = ms.filter((m) => sameEdition(m, e));
      const q = record(ym.filter((m) => m.phase === "qualifying"), code);
      const f = record(ym.filter((m) => m.phase === "final"), code);
      const fin = e.status === "scheduled" ? "In progress" : e.status === "cancelled" ? "Cancelled" : finish(ds, e, code);
      if (!ym.length && (!fin || fin === "Did not enter")) return "";
      return `<tr><td><a href="${eventHref(e.competition, e.year)}">${e.year}</a> <span class="yr-comp">${compBadge(e.competition)}</span></td><td class="hide-sm">${compBadge(e.competition)}</td><td>${wdl(q)}</td><td>${wdl(f)}</td><td>${esc(fin ?? "")}</td></tr>`;
    })
    .join("");

  const wins = ms.filter((m) => outcome(m, code) === "W");
  const winsCard = `<div class="card"><h2>Biggest wins</h2>${
    wins.length ? matchTable(ds, biggestWins(wins, 5), { perspective: code, showCompetition: true }) : `<div class="empty">No wins in the data yet.</div>`
  }</div>`;

  const scope = both ? "across both competitions, U-17 and U-20" : `in the ${COMP[comps[0] ?? "U17"].label} competition`;
  return `${pageHead([["Teams"], [t.name]], `${flagImg(t.flag)}${esc(t.name)}`, `Record, finishes and results ${scope}.${t.formerNames.length ? ` Also listed as ${esc(t.formerNames.join(", "))}.` : ""}`)}
    <div class="filters">${teamSelect(all, code, "team-pick", "Team")}${teamSelect(all, opp ?? "", "compare-pick", "Compare with…", { blank: true, exclude: code })}${filterNav}</div>
    ${summaryCard}
    ${opp ? comparison(ds, code, opp) : ""}
    <div class="grid cols-2">${charts}</div>
    <div class="card"><h2>By edition</h2>${
      byYear
        ? `<div class="table-wrap"><table><thead><tr><th>Year</th><th class="hide-sm">Competition</th><th><span class="hide-sm">Qualifiers W-D-L</span><span class="hide-lg">Qual.</span></th><th><span class="hide-sm">Finals W-D-L</span><span class="hide-lg">Finals</span></th><th>Finish</th></tr></thead><tbody>${byYear}</tbody></table></div>`
        : `<div class="empty">No results yet.</div>`
    }</div>
    <div class="grid cols-2">${winsCard}</div>
    <div class="card"><h2>All matches <span class="muted small">(${ms.length})</span></h2>${matchTable(ds, [...ms].reverse(), { perspective: code, showCompetition: true })}</div>`;
}
