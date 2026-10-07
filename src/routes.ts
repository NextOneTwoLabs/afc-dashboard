// Hash routing, kept free of the DOM so it can be tested.
import { sameEdition, type Competition, type Edition, type Match } from "./model";

export const TABS = [
  ["events", "Events"],
  ["team", "Teams"],
] as const;

/** What the router needs to know about the data. */
export interface RouteContext {
  years: number[];
  hasTeam: (code: string) => boolean;
  focus: string;
  /** Year of the most recent event: the default page (see latestEventYear). */
  latest?: number;
}

export interface Route {
  view: "events" | "team";
  args: string[];
}

export type Resolved = { route: Route } | { redirect: string };

/**
 * The most recent event, which the site opens on (owner's decision on #10):
 * the latest edition with at least one match in the data, qualifiers included.
 * With no matches at all, the latest completed edition.
 */
export function latestEventYear(all: Edition[], allMatches: Match[]): number | undefined {
  // U-17 only until the routes know about competitions (#30, phase 1b).
  const editions = all.filter((e) => e.competition === "U17");
  const matches = allMatches.filter((m) => m.competition === "U17");
  const years = new Set(editions.map((e) => e.year));
  const played = matches.map((m) => m.year).filter((y) => years.has(y));
  if (played.length) return Math.max(...played);
  const done = editions.filter((e) => e.status === "completed").map((e) => e.year);
  return done.length ? Math.max(...done) : undefined;
}

/**
 * The most recent event across competitions: the edition whose latest match is the most
 * recent (a tie on the date goes to U-17). With no matches, the latest completed edition.
 */
export function latestEvent(editions: Edition[], matches: Match[]): { competition: Competition; year: number } | undefined {
  const rank = (c: Competition) => (c === "U17" ? 1 : 0); // U-17 wins ties
  let best: { e: Edition; key: string } | undefined;
  for (const e of editions) {
    const last = matches.filter((m) => sameEdition(m, e)).reduce((d, m) => (m.date > d ? m.date : d), "");
    if (!last) continue;
    const key = `${last}|${rank(e.competition)}`;
    if (!best || key > best.key) best = { e, key };
  }
  if (!best) {
    for (const e of editions.filter((e) => e.status === "completed")) {
      const key = `${String(e.year).padStart(4, "0")}|${rank(e.competition)}`;
      if (!best || key > best.key) best = { e, key };
    }
  }
  return best && { competition: best.e.competition, year: best.e.year };
}

export function resolve(hash: string, ctx: RouteContext): Resolved {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [view, ...args] = path.split("/").filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(query);
  const to = (h: string): Resolved => ({ redirect: h });
  const home = to(ctx.latest !== undefined ? `#/events/${ctx.latest}` : "#/events");
  const year = (y: string | null | undefined) => (y && ctx.years.includes(Number(y)) ? Number(y) : undefined);
  const team = (c: string | null | undefined) => (c && ctx.hasTeam(c) ? c : undefined);
  const pair = (a?: string, b?: string) => {
    const t = team(a) ?? ctx.focus;
    const o = team(b);
    return o && o !== t ? `#/team/${t}/vs/${o}` : `#/team/${t}`;
  };

  switch (view) {
    case "events": {
      if (!args.length) return { route: { view: "events", args: [] } };
      const y = year(args[0]);
      return y !== undefined && args.length === 1 ? { route: { view: "events", args: [String(y)] } } : home;
    }
    case "team": {
      const [a, vs, b] = args;
      const ok = team(a) && (args.length === 1 || (args.length === 3 && vs === "vs" && team(b) && b !== a));
      return ok ? { route: { view: "team", args } } : to(pair(a, vs === "vs" ? b : undefined));
    }
    // Old links (before #10) keep working.
    case "overview":
      return to("#/events");
    case "edition": {
      const y = year(args[0]);
      return to(y !== undefined ? `#/events/${y}` : "#/events");
    }
    case "h2h":
      return to(pair(args[0], args[1]));
    case "matches": {
      const y = year(q.get("year")); // year wins over team
      const t = team(q.get("team"));
      return to(y !== undefined ? `#/events/${y}` : t ? `#/team/${t}` : "#/events");
    }
    case "records":
      return to("#/events");
    default:
      return home;
  }
}
