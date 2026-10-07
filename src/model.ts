import { parseCsv } from "./csv";

export type Phase = "qualifying" | "final";

/**
 * The competition family a row belongs to. U-17 data lives in data/*.csv, U-20 data in
 * data/u20/*.csv (same columns); the field is set from the folder when the data is loaded.
 */
export type Competition = "U17" | "U20";
export const COMPETITIONS: readonly Competition[] = ["U17", "U20"];

export interface Team {
  code: string; // FIFA trigram, e.g. HKG
  name: string;
  flag: string;
  formerNames: string[];
}

export interface Edition {
  competition: Competition;
  year: number;
  name: string;
  ageLimit: number;
  host: string;
  start: string;
  end: string;
  status: "completed" | "cancelled" | "scheduled";
  champion?: string;
  runnerUp?: string;
  third?: string;
  fourth?: string;
  verified: boolean;
  notes: string;
  source: string;
}

export interface Match {
  competition: Competition;
  id: string; // U-20 ids carry a "U20-" prefix, e.g. U20-2024-F-01
  year: number;
  phase: Phase;
  round: string; // "Round 1", "Group stage", "Semi-final", "Final", ...
  group: string; // "" for knockout matches
  date: string; // ISO yyyy-mm-dd
  venue: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  aet: boolean;
  hp?: number; // penalty shoot-out
  ap?: number;
  notes: string;
  source: string;
}

/** One team drawn into a group (data/draws.csv). Lets a group table list teams that haven't played yet. */
export interface Draw {
  competition: Competition;
  year: number;
  phase: Phase;
  round: string;
  group: string;
  team: string;
}

export interface Dataset {
  teams: Map<string, Team>;
  editions: Edition[];
  matches: Match[];
  draws: Draw[];
}

const int = (s: string) => (s === "" ? undefined : Number.parseInt(s, 10));
const opt = (s: string) => (s === "" ? undefined : s);

export function parseTeams(csv: string): Team[] {
  return parseCsv(csv).map((r) => ({
    code: r.code,
    name: r.name,
    flag: r.flag,
    formerNames: r.former_names ? r.former_names.split("|") : [],
  }));
}

export function parseEditions(csv: string, competition: Competition = "U17"): Edition[] {
  return parseCsv(csv)
    .map((r) => ({
      competition,
      year: Number(r.year),
      name: r.name,
      ageLimit: Number(r.age_limit),
      host: r.host,
      start: r.start,
      end: r.end,
      status: r.status as Edition["status"],
      champion: opt(r.champion),
      runnerUp: opt(r.runner_up),
      third: opt(r.third),
      fourth: opt(r.fourth),
      verified: r.verified === "1",
      notes: r.notes,
      source: r.source,
    }))
    .sort((a, b) => a.year - b.year);
}

export function parseMatches(csv: string, competition: Competition = "U17"): Match[] {
  return parseCsv(csv)
    .map((r) => ({
      competition,
      id: r.id,
      year: Number(r.year),
      phase: r.phase as Phase,
      round: r.round,
      group: r.group,
      date: r.date,
      venue: r.venue,
      home: r.home,
      away: r.away,
      hs: Number(r.hs),
      as: Number(r.as),
      aet: r.aet === "1" || r.aet === "true",
      hp: int(r.hp),
      ap: int(r.ap),
      notes: r.notes,
      source: r.source,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function parseDraws(csv: string, competition: Competition = "U17"): Draw[] {
  return parseCsv(csv).map((r) => ({
    competition,
    year: Number(r.year),
    phase: r.phase as Phase,
    round: r.round,
    group: r.group,
    team: r.team,
  }));
}

/** The U-20 files (data/u20/), same columns as the U-17 ones. */
export interface CompetitionCsv {
  editions: string;
  matches: string;
  draws?: string;
}

/**
 * `drawsCsv` is optional: without it, group tables list only teams that have a match.
 * `u20` is optional too: without it the dataset holds only U-17 rows.
 */
export function buildDataset(teamsCsv: string, editionsCsv: string, matchesCsv: string, drawsCsv = "", _u20?: CompetitionCsv): Dataset {
  return {
    teams: new Map(parseTeams(teamsCsv).map((t) => [t.code, t])),
    editions: parseEditions(editionsCsv, "U17"),
    matches: parseMatches(matchesCsv, "U17"),
    draws: parseDraws(drawsCsv, "U17"),
  };
}

/** True when a match or draw belongs to the given edition. */
export const sameEdition = (x: { competition: Competition; year: number }, ed: { competition: Competition; year: number }) => x.year === ed.year;

/** The dataset restricted to one competition (teams stay shared). */
export function forCompetition(ds: Dataset, c: Competition): Dataset {
  return {
    teams: ds.teams,
    editions: ds.editions.filter((e) => e.competition === c),
    matches: ds.matches.filter((m) => m.competition === c),
    draws: ds.draws.filter((d) => d.competition === c),
  };
}
