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
export const resBadge = (o: Outcome) => {
  const name = { W: "Win", D: "Draw", L: "Loss" }[o];
  // role="img" + aria-label: a screen reader says "Win", not a bare "W" (#31).
  return `<span class="form-chip inline ${o.toLowerCase()}" role="img" aria-label="${name}" title="${name}">${o}</span>`;
};

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

/** The stage as the phone meta line spells it ("Group G" rather than "Grp G", owner decision on #31). */
export const stageLong = (m: Match) => (isKnockout(m) ? m.round : `${m.round} · Group ${m.group}`);

export const phaseLabel = (p: Match["phase"]) => (p === "final" ? "Finals" : "Qualifiers");

/**
 * Match list; with `perspective`, adds a result column for that team. On phones (#31) each row
 * becomes two lines: a meta line (date · edition · stage, then the source link), then the teams.
 * The explicit ARIA roles keep the table semantics when the rows turn into grids.
 */
export function matchTable(ds: Dataset, matches: Match[], opts: { perspective?: string; showEdition?: boolean; showCompetition?: boolean } = {}): string {
  if (!matches.length) return `<div class="empty">No matches.</div>`;
  const { perspective, showEdition = true, showCompetition = false } = opts;
  const rows = matches
    .map((m) => {
      // Highlighting every row on the focus team's own pages would say nothing.
      const hk = perspective !== FOCUS && (m.home === FOCUS || m.away === FOCUS);
      const src = m.source ? ` <a href="${esc(m.source)}" target="_blank" rel="noopener" title="Source" aria-label="Source">↗</a>` : "";
      const ed = `${showCompetition ? `${COMP[m.competition].label} ` : ""}${m.year}`;
      const meta = [fmtDate(m.date), ...(showEdition ? [`${ed} ${phaseLabel(m.phase)}`] : []), stageLong(m)].map(esc).join(" · ");
      // c-meta comes first so a screen reader reads date, edition and stage before the score.
      return `<tr class="${hk ? "hk" : ""}" role="row">
        <td class="c-meta" role="cell">${meta}</td>
        <td class="c-date" role="cell">${esc(fmtDate(m.date))}</td>
        ${showEdition ? `<td class="c-ed" role="cell"><a href="${eventHref(m.competition, m.year)}">${showCompetition ? `${COMP[m.competition].label} ` : ""}${m.year}</a> <span class="muted small">${phaseLabel(m.phase)}</span></td>` : ""}
        <td class="c-stage" role="cell">${esc(stage(m))}</td>
        ${perspective ? `<td class="c-res" role="cell">${resBadge(outcome(m, perspective))}</td>` : ""}
        <td class="c-home" role="cell">${teamLink(ds, m.home)}</td>
        <td class="c-score" role="cell">${esc(scoreline(m))}</td>
        <td class="c-away" role="cell">${teamLink(ds, m.away)}</td>
        <td class="c-venue muted small" role="cell"><span class="venue-name">${esc(m.venue)}</span>${src}</td>
      </tr>`;
    })
    .join("");
  const th = (cls: string, label: string) => `<th class="${cls}" role="columnheader">${label}</th>`;
  return `<div class="table-wrap"><table class="matches${perspective ? "" : " no-res"}" role="table">
    <thead role="rowgroup"><tr role="row">${th("c-date", "Date")}${showEdition ? th("c-ed", "Edition") : ""}${th("c-stage", "Stage")}${perspective ? th("c-res", `<span class="sr-only">Result</span>`) : ""}${th("c-home", "Home")}${th("c-score", "Score")}${th("c-away", "Away")}${th("c-venue", "Venue")}</tr></thead>
    <tbody role="rowgroup">${rows}</tbody></table></div>`;
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
