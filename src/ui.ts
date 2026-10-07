import type { Dataset, Match } from "./model";
import { isKnockout, outcome, scoreline, type Outcome } from "./stats";

/** The team the dashboard spotlights. */
export const FOCUS = "HKG";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const teamName = (ds: Dataset, code: string) => ds.teams.get(code)?.name ?? code;

// A word joiner (U+2060) keeps the flag on the same line as the name when a long name wraps.
export function teamLink(ds: Dataset, code: string | undefined): string {
  if (!code) return `<span class="muted">—</span>`;
  const t = ds.teams.get(code);
  return `<a class="team${code === FOCUS ? " hk" : ""}" href="#/team/${esc(code)}"><span class="flag" aria-hidden="true">${esc(t?.flag ?? "")}</span>\u2060${esc(t?.name ?? code)}</a>`;
}

export const resBadge = (o: Outcome) => `<span class="res ${o}" title="${{ W: "Win", D: "Draw", L: "Loss" }[o]}">${o}</span>`;

export const fmtDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

export const stage = (m: Match) => (isKnockout(m) ? m.round : `${m.round} · Grp ${m.group}`);

export const phaseLabel = (p: Match["phase"]) => (p === "final" ? "Finals" : "Qualifiers");

/** Match list; with `perspective`, adds a result column for that team. */
export function matchTable(ds: Dataset, matches: Match[], opts: { perspective?: string; showEdition?: boolean; showCompetition?: boolean } = {}): string {
  if (!matches.length) return `<div class="empty">No matches.</div>`;
  const { perspective, showEdition = true } = opts;
  const rows = matches
    .map((m) => {
      // Highlighting every row on the focus team's own pages would say nothing.
      const hk = perspective !== FOCUS && (m.home === FOCUS || m.away === FOCUS);
      const src = m.source ? ` <a href="${esc(m.source)}" target="_blank" rel="noopener" title="Source" aria-label="Source">↗</a>` : "";
      return `<tr class="${hk ? "hk" : ""}">
        <td>${esc(fmtDate(m.date))}</td>
        ${showEdition ? `<td class="hide-sm"><a href="#/events/${m.year}">${m.year}</a> <span class="muted small">${phaseLabel(m.phase)}</span></td>` : ""}
        <td class="hide-sm">${esc(stage(m))}</td>
        ${perspective ? `<td>${resBadge(outcome(m, perspective))}</td>` : ""}
        <td class="home">${teamLink(ds, m.home)}</td>
        <td class="score">${esc(scoreline(m))}</td>
        <td>${teamLink(ds, m.away)}</td>
        <td class="hide-sm muted small">${esc(m.venue)}${src}</td>
      </tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th>${showEdition ? `<th class="hide-sm">Edition</th>` : ""}<th class="hide-sm">Stage</th>${perspective ? "<th></th>" : ""}<th class="num">Home</th><th style="text-align:center">Score</th><th>Away</th><th class="hide-sm">Venue</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

export const emptyData = () =>
  `<div class="empty">Match data hasn't been loaded yet. Results will appear here once the dataset is filled in.</div>`;
