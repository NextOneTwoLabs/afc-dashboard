import type { Dataset, Edition, Match, Phase } from "./model";

export type Outcome = "W" | "D" | "L";

export const involves = (m: Match, team: string) => m.home === team || m.away === team;
export const opponent = (m: Match, team: string) => (m.home === team ? m.away : m.home);
export const goalsFor = (m: Match, team: string) => (m.home === team ? m.hs : m.as);
export const goalsAgainst = (m: Match, team: string) => (m.home === team ? m.as : m.hs);
export const isKnockout = (m: Match) => m.group === "";

/** Result on the scoresheet. A shoot-out win still counts as a draw (FIFA/AFC convention). */
export function outcome(m: Match, team: string): Outcome {
  const d = goalsFor(m, team) - goalsAgainst(m, team);
  return d > 0 ? "W" : d < 0 ? "L" : "D";
}

/** Team that advanced from the match, counting penalties; undefined for a group draw. */
export function winner(m: Match): string | undefined {
  if (m.hs !== m.as) return m.hs > m.as ? m.home : m.away;
  if (m.hp !== undefined && m.ap !== undefined && m.hp !== m.ap) return m.hp > m.ap ? m.home : m.away;
  return undefined;
}

export function scoreline(m: Match): string {
  let s = `${m.hs}–${m.as}`;
  if (m.aet) s += " (a.e.t.)";
  if (m.hp !== undefined && m.ap !== undefined) s += ` (${m.hp}–${m.ap} p)`;
  return s;
}

export interface Record {
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
}

export function record(matches: Match[], team: string): Record {
  const r: Record = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const m of matches) {
    if (!involves(m, team)) continue;
    r.p++;
    r.gf += goalsFor(m, team);
    r.ga += goalsAgainst(m, team);
    const o = outcome(m, team);
    if (o === "W") r.w++;
    else if (o === "D") r.d++;
    else r.l++;
  }
  return r;
}

export interface StandingRow extends Record {
  team: string;
  pts: number;
  gd: number;
}

function rows(matches: Match[], teams: string[]): StandingRow[] {
  return teams.map((team) => {
    const r = record(matches, team);
    return { team, ...r, pts: 3 * r.w + r.d, gd: r.gf - r.ga };
  });
}

/**
 * Group table using AFC tie-breakers: points, then head-to-head points, goal
 * difference and goals among the tied teams, then overall goal difference and
 * goals scored. (Fair-play and drawing of lots can't be derived from scores;
 * those rare cases are fixed by match order in the data notes.)
 */
export function standings(matches: Match[]): StandingRow[] {
  const teams = [...new Set(matches.flatMap((m) => [m.home, m.away]))];
  const table = rows(matches, teams);

  const byPts = new Map<number, StandingRow[]>();
  for (const r of table) byPts.set(r.pts, [...(byPts.get(r.pts) ?? []), r]);

  const ordered: StandingRow[] = [];
  for (const pts of [...byPts.keys()].sort((a, b) => b - a)) {
    const tied = byPts.get(pts)!;
    if (tied.length === 1) {
      ordered.push(tied[0]);
      continue;
    }
    const names = tied.map((t) => t.team);
    const mini = new Map(
      rows(
        matches.filter((m) => names.includes(m.home) && names.includes(m.away)),
        names,
      ).map((r) => [r.team, r]),
    );
    tied.sort((a, b) => {
      const ma = mini.get(a.team)!;
      const mb = mini.get(b.team)!;
      return mb.pts - ma.pts || mb.gd - ma.gd || mb.gf - ma.gf || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team);
    });
    ordered.push(...tied);
  }
  return ordered;
}

/** Group matches of one edition/phase keyed by "Round · Group X". */
export function groups(matches: Match[], year: number, phase: Phase): Map<string, Match[]> {
  const out = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.year !== year || m.phase !== phase || isKnockout(m)) continue;
    const key = `${m.round} · Group ${m.group}`;
    out.set(key, [...(out.get(key) ?? []), m]);
  }
  return out;
}

export const FINISHES = [
  "Champion",
  "Runner-up",
  "Third",
  "Fourth",
  "Semi-finals",
  "Quarter-finals",
  "Group stage",
  "Qualifying",
  "Did not enter",
] as const;
export type Finish = (typeof FINISHES)[number];

export function finish(ds: Dataset, ed: Edition, team: string): Finish | undefined {
  if (ed.status !== "completed") return undefined;
  if (ed.champion === team) return "Champion";
  if (ed.runnerUp === team) return "Runner-up";
  if (ed.third === team) return "Third";
  if (ed.fourth === team) return "Fourth";
  const ms = ds.matches.filter((m) => m.year === ed.year && involves(m, team));
  const finals = ms.filter((m) => m.phase === "final");
  // Without a podium place, the furthest knockout round reached (README round names).
  if (finals.some((m) => m.round === "Semi-final")) return "Semi-finals";
  if (finals.some((m) => m.round === "Quarter-final")) return "Quarter-finals";
  if (finals.length) return "Group stage";
  if (ms.some((m) => m.phase === "qualifying")) return "Qualifying";
  return "Did not enter";
}

export interface TeamSummary {
  code: string;
  finals: Record;
  qualifying: Record;
  appearances: number;
  titles: number;
  best?: Finish;
}

export function teamSummary(ds: Dataset, code: string): TeamSummary {
  const fins = ds.editions.map((e) => finish(ds, e, code)).filter((f): f is Finish => !!f);
  const best = fins.filter((f) => f !== "Did not enter").sort((a, b) => FINISHES.indexOf(a) - FINISHES.indexOf(b))[0];
  return {
    code,
    finals: record(ds.matches.filter((m) => m.phase === "final"), code),
    qualifying: record(ds.matches.filter((m) => m.phase === "qualifying"), code),
    // Completed editions with a finals-level finish: a podium place counts even without match rows.
    appearances: fins.filter((f) => FINISHES.indexOf(f) <= FINISHES.indexOf("Group stage")).length,
    titles: ds.editions.filter((e) => e.champion === code).length,
    best,
  };
}

/** Teams that appear in any match, plus any team named on an edition podium. */
export function activeTeams(ds: Dataset): string[] {
  const s = new Set(ds.matches.flatMap((m) => [m.home, m.away]));
  for (const e of ds.editions) for (const t of [e.champion, e.runnerUp, e.third, e.fourth]) if (t) s.add(t);
  return [...s].sort((a, b) => (ds.teams.get(a)?.name ?? a).localeCompare(ds.teams.get(b)?.name ?? b));
}

export interface MedalRow {
  team: string;
  gold: number;
  silver: number;
  bronze: number;
  fourth: number;
}

export function medalTable(editions: Edition[]): MedalRow[] {
  const m = new Map<string, MedalRow>();
  const get = (t: string) => m.get(t) ?? m.set(t, { team: t, gold: 0, silver: 0, bronze: 0, fourth: 0 }).get(t)!;
  for (const e of editions) {
    if (e.champion) get(e.champion).gold++;
    if (e.runnerUp) get(e.runnerUp).silver++;
    if (e.third) get(e.third).bronze++;
    if (e.fourth) get(e.fourth).fourth++;
  }
  return [...m.values()].sort(
    (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.fourth - a.fourth || a.team.localeCompare(b.team),
  );
}

export function biggestWins(matches: Match[], n = 10): Match[] {
  return [...matches].sort((a, b) => Math.abs(b.hs - b.as) - Math.abs(a.hs - a.as) || b.hs + b.as - (a.hs + a.as)).slice(0, n);
}

export function highestScoring(matches: Match[], n = 10): Match[] {
  return [...matches].sort((a, b) => b.hs + b.as - (a.hs + a.as) || Math.abs(b.hs - b.as) - Math.abs(a.hs - a.as)).slice(0, n);
}

export interface Run {
  team: string;
  length: number;
  from: Match;
  to: Match;
  ongoing: boolean;
}

/** Longest unbeaten runs (W or D on the scoresheet), across qualifiers and finals. Matches must be date-sorted. */
export function unbeatenRuns(matches: Match[], teams: string[], n = 10): Run[] {
  const best: Run[] = [];
  for (const team of teams) {
    const ms = matches.filter((m) => involves(m, team));
    let start = 0;
    let top: Run | undefined;
    for (let i = 0; i <= ms.length; i++) {
      if (i === ms.length || outcome(ms[i], team) === "L") {
        const len = i - start;
        if (len > 0 && (!top || len > top.length)) {
          top = { team, length: len, from: ms[start], to: ms[i - 1], ongoing: i === ms.length };
        }
        start = i + 1;
      }
    }
    if (top) best.push(top);
  }
  return best.sort((a, b) => b.length - a.length || a.team.localeCompare(b.team)).slice(0, n);
}
