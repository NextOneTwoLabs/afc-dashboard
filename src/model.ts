import { parseCsv } from "./csv";

export type Phase = "qualifying" | "final";

export interface Team {
  code: string; // FIFA trigram, e.g. HKG
  name: string;
  flag: string;
  formerNames: string[];
}

export interface Edition {
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
  id: string;
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

export interface Dataset {
  teams: Map<string, Team>;
  editions: Edition[];
  matches: Match[];
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

export function parseEditions(csv: string): Edition[] {
  return parseCsv(csv)
    .map((r) => ({
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

export function parseMatches(csv: string): Match[] {
  return parseCsv(csv)
    .map((r) => ({
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

export function buildDataset(teamsCsv: string, editionsCsv: string, matchesCsv: string): Dataset {
  return {
    teams: new Map(parseTeams(teamsCsv).map((t) => [t.code, t])),
    editions: parseEditions(editionsCsv),
    matches: parseMatches(matchesCsv),
  };
}
