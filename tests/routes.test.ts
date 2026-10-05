import { describe, expect, it } from "vitest";
import { TABS, resolve, type RouteContext } from "../src/routes";

const ctx: RouteContext = {
  years: [2005, 2024, 2026, 2027],
  hasTeam: (c) => ["HKG", "JPN", "PRK", "KOR"].includes(c),
  focus: "HKG",
  latest: 2026,
};
const go = (hash: string) => {
  const r = resolve(hash, ctx);
  return "redirect" in r ? r.redirect : `${r.route.view}:${r.route.args.join("/")}`;
};

describe("routes", () => {
  it("has exactly two tabs: Events and Teams", () => {
    expect(TABS.map(([k]) => k)).toEqual(["events", "team"]);
  });

  it("opens the most recent event by default and for unknown routes", () => {
    expect(go("")).toBe("#/events/2026");
    expect(go("#/")).toBe("#/events/2026");
    expect(go("#/nonsense")).toBe("#/events/2026");
    expect(go("#/events/1999")).toBe("#/events/2026");
  });

  it("renders the new routes", () => {
    expect(go("#/events")).toBe("events:");
    expect(go("#/events/2024")).toBe("events:2024");
    expect(go("#/team/JPN")).toBe("team:JPN");
    expect(go("#/team/HKG/vs/JPN")).toBe("team:HKG/vs/JPN");
  });

  it("falls back on bad team codes instead of showing an error", () => {
    expect(go("#/team")).toBe("#/team/HKG");
    expect(go("#/team/XXX")).toBe("#/team/HKG");
    expect(go("#/team/HKG/vs/XXX")).toBe("#/team/HKG");
    expect(go("#/team/HKG/vs/HKG")).toBe("#/team/HKG");
  });

  // Old links keep working. Each row: old hash -> new hash.
  const redirects: [string, string][] = [
    ["#/overview", "#/events"],
    ["#/edition", "#/events"],
    ["#/edition/2024", "#/events/2024"],
    ["#/h2h", "#/team/HKG"],
    ["#/h2h/JPN", "#/team/JPN"],
    ["#/h2h/XXX", "#/team/HKG"],
    ["#/h2h/JPN/PRK", "#/team/JPN/vs/PRK"],
    ["#/h2h/JPN/JPN", "#/team/JPN"],
    ["#/h2h/JPN/XXX", "#/team/JPN"],
    ["#/matches", "#/events"],
    ["#/matches?year=2024", "#/events/2024"],
    ["#/matches?year=2024&team=JPN", "#/events/2024"], // year wins over team
    ["#/matches?team=JPN&phase=final", "#/team/JPN"],
    ["#/matches?phase=qualifying", "#/events"],
    ["#/matches?q=bali", "#/events"],
    ["#/records", "#/events"],
  ];
  it.each(redirects)("redirects %s to %s", (from, to) => {
    expect(go(from)).toBe(to);
  });
});
