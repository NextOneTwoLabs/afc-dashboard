import { barChart } from "../charts";
import { forCompetition, sameEdition, type Competition, type Dataset, type Match } from "../model";
import { activeTeams, biggestWins, highestScoring, medalTable, unbeatenRuns } from "../stats";
import { FOCUS, emptyData, esc, fmtDate, matchTable, teamLink, teamName } from "../ui";

/** All-time records: the former Records tab. */
function records(ds: Dataset): string {
  const head = `<h2 id="records" style="margin-top:28px;font-size:20px">All-time records</h2>`;
  if (!ds.matches.length) return head + emptyData();
  const finals = ds.matches.filter((m) => m.phase === "final");
  const tbl = (title: string, ms: Match[]) => `<div class="card"><h2>${esc(title)}</h2>${matchTable(ds, ms)}</div>`;
  const runs = unbeatenRuns(ds.matches, activeTeams(ds))
    .map(
      (r) => `<tr class="${r.team === FOCUS ? "hk" : ""}"><td>${teamLink(ds, r.team)}</td><td class="num"><strong>${r.length}</strong></td>
        <td class="small">${esc(fmtDate(r.from.date))} – ${r.ongoing ? "latest match" : esc(fmtDate(r.to.date))}</td></tr>`,
    )
    .join("");
  return `${head}
    <p class="lede">Across every edition in the data. Shoot-out results count as draws; unbeaten runs span qualifiers and finals.</p>
    ${tbl("Biggest wins", biggestWins(ds.matches))}
    ${tbl("Biggest wins at the finals", biggestWins(finals, 5))}
    ${tbl("Highest-scoring matches", highestScoring(ds.matches))}
    <div class="card"><h2>Longest unbeaten runs</h2><div class="table-wrap"><table><thead><tr><th>Team</th><th class="num">Matches</th><th>Span</th></tr></thead><tbody>${runs}</tbody></table></div></div>`;
}

/** The Events overview (#/events): every edition, medals, goals and all-time records. */
export function events(all: Dataset, competition: Competition = "U17"): string {
  const ds = forCompetition(all, competition);
  const held = ds.editions.filter((e) => e.status === "completed");
  const goals = ds.matches.reduce((n, m) => n + m.hs + m.as, 0);
  const finals = ds.matches.filter((m) => m.phase === "final");

  const tiles = `<div class="tiles">
    <div class="tile"><div class="k">Editions held</div><div class="v">${held.length}</div><div class="s">${held[0]?.year ?? ""}–${held.at(-1)?.year ?? ""}</div></div>
    <div class="tile"><div class="k">Matches in data</div><div class="v">${ds.matches.length}</div><div class="s">${finals.length} finals · ${ds.matches.length - finals.length} qualifiers</div></div>
    <div class="tile"><div class="k">Goals</div><div class="v">${goals}</div><div class="s">${ds.matches.length ? (goals / ds.matches.length).toFixed(2) : "–"} per match</div></div>
    <div class="tile"><div class="k">Nations</div><div class="v">${activeTeams(ds).length}</div><div class="s">played or placed</div></div>
  </div>`;

  const timeline = `<div class="card"><h2>Champions by edition</h2><div class="timeline">${ds.editions
    .map((e) => {
      const body =
        e.status === "completed"
          ? `<div class="c">🏆 ${esc(teamName(ds, e.champion ?? "")) || "—"}</div>`
          : `<div class="c muted">${e.status === "cancelled" ? "Cancelled" : "Upcoming"}</div>`;
      return `<a class="ed ${e.status}" href="#/events/${e.year}"><div class="y">${e.year}${e.verified ? "" : ` <span class="badge warn" title="Not yet checked against sources">unverified</span>`}</div><div class="h">U-${e.ageLimit} · ${esc(e.host)}</div>${body}</a>`;
    })
    .join("")}</div></div>`;

  const medalCard = `<div class="card"><h2>Medal table</h2><div class="table-wrap"><table>
    <thead><tr><th>Team</th><th class="num">🥇</th><th class="num">🥈</th><th class="num">🥉</th><th class="num">4th</th></tr></thead>
    <tbody>${medalTable(ds.editions)
      .map((r) => `<tr class="${r.team === FOCUS ? "hk" : ""}"><td>${teamLink(ds, r.team)}</td><td class="num">${r.gold}</td><td class="num">${r.silver}</td><td class="num">${r.bronze}</td><td class="num">${r.fourth}</td></tr>`)
      .join("")}</tbody></table></div></div>`;

  const perEdition = held
    .map((e) => {
      const ms = finals.filter((m) => sameEdition(m, e));
      return { e, n: ms.length, g: ms.reduce((n, m) => n + m.hs + m.as, 0) };
    })
    .filter((x) => x.n > 0);
  const goalsCard = `<div class="card"><h2>Goals per match at the finals</h2>${
    perEdition.length
      ? barChart(
          perEdition.map(({ e, n, g }) => ({ label: String(e.year), value: g / n, tip: `${e.year}: ${(g / n).toFixed(2)} per match (${g} goals in ${n} matches)` })),
          { title: "Goals per match at each final tournament", fmt: (v) => v.toFixed(1) },
        )
      : `<div class="empty">Appears once final-tournament results are loaded.</div>`
  }</div>`;

  return `<h1>All events</h1>
    <p class="lede">A research reference for every edition of the AFC's youngest women's championship — U-17 in 2005, U-16 from 2007 to 2019, U-17 again since 2024 — qualifiers included. Pick an edition for its groups, knockout and qualifying results.</p>
    ${tiles}${timeline}<div class="grid cols-2" style="margin-top:16px">${medalCard}${goalsCard}</div>${records(ds)}`;
}
