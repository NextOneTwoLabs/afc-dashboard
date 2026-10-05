import { barChart } from "../charts";
import type { Dataset } from "../model";
import { activeTeams, medalTable, teamSummary } from "../stats";
import { FOCUS, esc, teamLink, teamName } from "../ui";

export function overview(ds: Dataset): string {
  const held = ds.editions.filter((e) => e.status === "completed");
  const goals = ds.matches.reduce((n, m) => n + m.hs + m.as, 0);
  const finals = ds.matches.filter((m) => m.phase === "final");
  const nations = activeTeams(ds).length;

  const tiles = `<div class="tiles">
    <div class="tile"><div class="k">Editions</div><div class="v">${held.length}</div><div class="s">${held[0]?.year ?? ""}–${held.at(-1)?.year ?? ""}</div></div>
    <div class="tile"><div class="k">Matches</div><div class="v">${ds.matches.length}</div><div class="s">${finals.length} finals · ${ds.matches.length - finals.length} qualifiers</div></div>
    <div class="tile"><div class="k">Goals</div><div class="v">${goals}</div><div class="s">${ds.matches.length ? (goals / ds.matches.length).toFixed(2) : "–"} per match</div></div>
    <div class="tile"><div class="k">Nations</div><div class="v">${nations}</div><div class="s">played or placed</div></div>
  </div>`;

  const timeline = `<div class="card"><h2>Champions</h2><div class="timeline">${ds.editions
    .map((e) => {
      const body =
        e.status === "completed"
          ? `<div class="c">🏆 ${teamName(ds, e.champion ?? "") || "—"}</div>`
          : `<div class="c muted">${e.status === "cancelled" ? "Cancelled" : "Upcoming"}</div>`;
      return `<a class="ed ${e.status}" href="#/edition/${e.year}"><div class="y">${e.year}${e.verified ? "" : ` <span class="badge warn" title="Not yet checked against sources">unverified</span>`}</div><div class="h">U-${e.ageLimit} · ${esc(e.host)}</div>${body}</a>`;
    })
    .join("")}</div></div>`;

  const medals = medalTable(ds.editions);
  const medalCard = `<div class="card"><h2>Medal table</h2><div class="table-wrap"><table>
    <thead><tr><th>Team</th><th class="num">🥇</th><th class="num">🥈</th><th class="num">🥉</th><th class="num">4th</th></tr></thead>
    <tbody>${medals
      .map((r) => `<tr class="${r.team === FOCUS ? "hk" : ""}"><td>${teamLink(ds, r.team)}</td><td class="num">${r.gold}</td><td class="num">${r.silver}</td><td class="num">${r.bronze}</td><td class="num">${r.fourth}</td></tr>`)
      .join("")}</tbody></table></div></div>`;

  const perEdition = held
    .map((e) => {
      const ms = finals.filter((m) => m.year === e.year);
      const g = ms.reduce((n, m) => n + m.hs + m.as, 0);
      return { e, n: ms.length, g };
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

  const hk = teamSummary(ds, FOCUS);
  const spot = `<div class="card"><div class="card-head"><h2>${teamLink(ds, FOCUS)} spotlight</h2><a href="#/team/${FOCUS}">Full profile →</a></div>
    <div class="tiles" style="margin:8px 0 0">
      <div class="tile"><div class="k">Finals appearances</div><div class="v">${hk.appearances}</div></div>
      <div class="tile"><div class="k">Best finish</div><div class="v" style="font-size:20px">${hk.best ?? "—"}</div></div>
      <div class="tile"><div class="k">Qualifiers W-D-L</div><div class="v" style="font-size:20px">${hk.qualifying.w}-${hk.qualifying.d}-${hk.qualifying.l}</div><div class="s">${hk.qualifying.p} played</div></div>
      <div class="tile"><div class="k">Finals W-D-L</div><div class="v" style="font-size:20px">${hk.finals.w}-${hk.finals.d}-${hk.finals.l}</div><div class="s">${hk.finals.p} played</div></div>
    </div></div>`;

  return `<h1>Women's U-17 Asian Cup history</h1>
    <p class="lede">Every edition of the AFC's youngest women's championship — U-17 in 2005, U-16 from 2007 to 2019, U-17 again since 2024 — including qualifiers.</p>
    ${tiles}${spot}${timeline}<div class="grid cols-2" style="margin-top:16px">${medalCard}${goalsCard}</div>`;
}
