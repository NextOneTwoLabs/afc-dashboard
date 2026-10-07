// Hash routing, kept free of the DOM so it can be tested.
import { COMP, eventHref, fromSlug } from "./competitions";
import { sameEdition, type Competition, type Edition, type Match } from "./model";

export const TABS = [
  ["events", "Events"],
  ["team", "Teams"],
] as const;

/** What the router needs to know about the data. */
export interface RouteContext {
  /** Edition years of each competition. */
  years: Record<Competition, number[]>;
  hasTeam: (code: string) => boolean;
  focus: string;
  /** The most recent event: the default page (see latestEvent). */
  latest?: { competition: Competition; year: number };
}

export interface Route {
  view: "events" | "team";
  args: string[];
  /** Team pages: one competition only (?c=u17 or ?c=u20); absent = both. */
  filter?: Competition;
}

export type Resolved = { route: Route } | { redirect: string };

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
  const page = (r: Route): Resolved => ({ route: r });
  // Old links all meant U-17, and each redirects straight to its final page (amendment D).
  const u17 = "#/events/u17";
  const home = to(ctx.latest ? eventHref(ctx.latest.competition, ctx.latest.year) : u17);
  const yearIn = (c: Competition, y: string | null | undefined) => (y && /^\d+$/.test(y) && ctx.years[c].includes(Number(y)) ? Number(y) : undefined);
  const team = (c: string | null | undefined) => (c && ctx.hasTeam(c) ? c : undefined);
  const pair = (a?: string, b?: string) => {
    const t = team(a) ?? ctx.focus;
    const o = team(b);
    return o && o !== t ? `#/team/${t}/vs/${o}` : `#/team/${t}`;
  };

  switch (view) {
    case "events": {
      if (!args.length) return to(u17);
      const c = fromSlug(args[0]);
      if (c) {
        if (args.length === 1) return page({ view: "events", args: [COMP[c].slug] });
        const y = yearIn(c, args[1]);
        return y !== undefined && args.length === 2 ? page({ view: "events", args: [COMP[c].slug, String(y)] }) : home;
      }
      const y = args.length === 1 ? yearIn("U17", args[0]) : undefined; // old #/events/<year>
      return y !== undefined ? to(eventHref("U17", y)) : home;
    }
    case "team": {
      const [a, vs, b] = args;
      const c = q.get("c");
      const filter = fromSlug(c);
      const suffix = filter ? `?c=${COMP[filter].slug}` : "";
      const ok = team(a) && (args.length === 1 || (args.length === 3 && vs === "vs" && team(b) && b !== a));
      if (!ok) return to(pair(a, vs === "vs" ? b : undefined) + suffix);
      if (c !== null && !filter) return to(`#/team/${args.join("/")}`); // ?c=both or junk: both competitions
      return page({ view: "team", args, ...(filter ? { filter } : {}) });
    }
    case "overview":
    case "records":
      return to(u17);
    case "edition": {
      const y = yearIn("U17", args[0]);
      return to(y !== undefined ? eventHref("U17", y) : u17);
    }
    case "h2h":
      return to(pair(args[0], args[1]));
    case "matches": {
      const y = yearIn("U17", q.get("year")); // year wins over team
      const t = team(q.get("team"));
      return to(y !== undefined ? eventHref("U17", y) : t ? `#/team/${t}` : u17);
    }
    default:
      return home;
  }
}
