import { COMP, eventHref } from "./competitions";
import type { Competition, Dataset, Match } from "./model";
import { isKnockout, outcome, scoreline, type Outcome } from "./stats";

/** The team the dashboard spotlights. */
export const FOCUS = "HKG";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const teamName = (ds: Dataset, code: string) => ds.teams.get(code)?.name ?? code;

/** ISO 3166 alpha-2 (lower case) from a flag emoji's two regional-indicator letters. */
export const flagIso2 = (emoji: string) => [...emoji].map((c) => String.fromCharCode(c.codePointAt(0)! - 0x1f1e6 + 97)).join("");

/** A decorative flag image (#46) plus a word joiner, from the local public/flags/ SVGs; empty for a team with no flag (Chinese Taipei). */
export function flagImg(emoji: string | undefined): string {
  if (!emoji) return "";
  // The word joiner keeps the flag on the same line as the name when a long name wraps.
  return `<img class="flag" src="${import.meta.env.BASE_URL}flags/${flagIso2(emoji)}.svg" alt="" aria-hidden="true" width="16" height="12">\u2060`;
}

export function teamLink(ds: Dataset, code: string | undefined): string {
  if (!code) return `<span class="muted">—</span>`;
  const t = ds.teams.get(code);
  return `<a class="team${code === FOCUS ? " hk" : ""}" href="#/team/${esc(code)}">${flagImg(t?.flag)}${esc(t?.name ?? code)}</a>`;
}

/** A result as the family's form chip (#39): W accent, D slate, L danger. */
export const resBadge = (o: Outcome) => `<span class="form-chip inline ${o.toLowerCase()}" title="${{ W: "Win", D: "Draw", L: "Loss" }[o]}">${o}</span>`;

/** The family page head (#39): breadcrumb, title and sub-line in a band under the header. */
export function pageHead(crumbs: [string, string?][], title: string, sub = ""): string {
  const trail = crumbs
    .map(([label, href], i) =>
      i === crumbs.length - 1 ? `<span class="breadcrumb-current">${esc(label)}</span>` : href ? `<a href="${esc(href)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`,
    )
    .join(`<span class="breadcrumb-sep" aria-hidden="true">›</span>`);
  return `<div class="page-head"><nav class="breadcrumb" aria-label="Breadcrumb">${trail}</nav><h1>${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ""}</div>`;
}

export const fmtDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

export const stage = (m: Match) => (isKnockout(m) ? m.round : `${m.round} · Grp ${m.group}`);

export const phaseLabel = (p: Match["phase"]) => (p === "final" ? "Finals" : "Qualifiers");

/** Match list; with `perspective`, adds a result column for that team. */
export function matchTable(ds: Dataset, matches: Match[], opts: { perspective?: string; showEdition?: boolean; showCompetition?: boolean } = {}): string {
  if (!matches.length) return `<div class="empty">No matches.</div>`;
  const { perspective, showEdition = true, showCompetition = false } = opts;
  const rows = matches
    .map((m) => {
      // Highlighting every row on the focus team's own pages would say nothing.
      const hk = perspective !== FOCUS && (m.home === FOCUS || m.away === FOCUS);
      const src = m.source ? ` <a href="${esc(m.source)}" target="_blank" rel="noopener" title="Source" aria-label="Source">↗</a>` : "";
      return `<tr class="${hk ? "hk" : ""}">
        <td>${esc(fmtDate(m.date))}</td>
        ${showEdition ? `<td class="hide-sm"><a href="${eventHref(m.competition, m.year)}">${showCompetition ? `${COMP[m.competition].label} ` : ""}${m.year}</a> <span class="muted small">${phaseLabel(m.phase)}</span></td>` : ""}
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

/** A row of linked options with the current one marked, e.g. the U-17 / U-20 switch. */
export function segmented(label: string, items: { label: string; href: string; current: boolean }[]): string {
  return `<div class="seg" role="group" aria-label="${esc(label)}">${items
    .map((i) => `<a class="seg-btn${i.current ? " active" : ""}" href="${esc(i.href)}"${i.current ? ' aria-current="page"' : ""}>${esc(i.label)}</a>`)
    .join("")}</div>`;
}

/** A small label naming a competition, e.g. in the team page's tables. */
export const compBadge = (c: Competition) => `<span class="badge comp">${COMP[c].label}</span>`;

export const emptyData = () =>
  `<div class="empty">Match data hasn't been loaded yet. Results will appear here once the dataset is filled in.</div>`;
