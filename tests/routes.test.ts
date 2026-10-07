import { describe, expect, it } from "vitest";
import type { Match } from "../src/model";
import { TABS, latestEventYear, resolve, type RouteContext } from "../src/routes";
import { loadDataset } from "./load";

const ctx: RouteContext = {
  years: { U17: [2005, 2024, 2026, 2027], U20: [] },
  hasTeam: (c) => ["HKG", "JPN", "PRK", "KOR"].includes(c),
  focus: "HKG",
  latest: { competition: "U17", year: 2026 },
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

describe("latestEventYear (the default page)", () => {
  const base = loadDataset("data");
  // Built from the real editions so the test doesn't depend on which results have been entered.
  const m = (year: number, phase: "final" | "qualifying"): Match => ({
    competition: "U17", id: `${year}-x`, year, phase, round: "Round 1", group: "A", date: `${year - 1}-10-01`, venue: "", home: "HKG", away: "JPN", hs: 0, as: 1, aet: false, notes: "", source: "",
  });

  it("is the latest edition with matches: 2026 without any 2027 rows", () => {
    expect(latestEventYear(base.editions, [m(2024, "final"), m(2026, "final")])).toBe(2026);
  });

  it("moves to 2027 as soon as one 2027 match (a qualifier) is in the data", () => {
    expect(latestEventYear(base.editions, [m(2024, "final"), m(2026, "final"), m(2027, "qualifying")])).toBe(2027);
  });

  it("falls back to the latest completed edition when there are no matches", () => {
    expect(latestEventYear(base.editions, [])).toBe(2026);
  });

  it("ignores matches for years with no edition row", () => {
    expect(latestEventYear(base.editions, [m(2026, "final"), m(2031, "final")])).toBe(2026);
  });
});
