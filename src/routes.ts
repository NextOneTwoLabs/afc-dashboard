// Hash routing, kept free of the DOM so it can be tested.

export const TABS = [
  ["overview", "Overview"],
  ["edition", "Editions"],
  ["team", "Teams"],
  ["h2h", "Head-to-head"],
  ["matches", "Matches"],
  ["records", "Records"],
] as const;

/** What the router needs to know about the data. */
export interface RouteContext {
  years: number[];
  hasTeam: (code: string) => boolean;
  focus: string;
  /** Year of the most recent event: the default page. */
  latest?: number;
}

export interface Route {
  view: string;
  args: string[];
  query: URLSearchParams;
}

export type Resolved = { route: Route } | { redirect: string };

export function parseHash(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [view = "overview", ...args] = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { view, args, query: new URLSearchParams(query) };
}

export function resolve(hash: string, _ctx: RouteContext): Resolved {
  const r = parseHash(hash);
  return { route: TABS.some(([k]) => k === r.view) ? r : { ...r, view: "overview" } };
}
