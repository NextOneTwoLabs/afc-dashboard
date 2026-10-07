import { describe, expect, it } from "vitest";
import type { Match } from "../src/model";
import { TABS, latestEvent, resolve, type RouteContext } from "../src/routes";
import { loadU17 } from "./load";

const ctx: RouteContext = {
  years: { U17: [2005, 2024, 2026, 2027], U20: [2002, 2024, 2026] },
  hasTeam: (c) => ["HKG", "JPN", "PRK", "KOR"].includes(c),
  focus: "HKG",
  latest: { competition: "U17", year: 2026 },
};
const show = (r: ReturnType<typeof resolve>) =>
  "redirect" in r ? r.redirect : `${r.route.view}:${r.route.args.join("/")}${r.route.filter ? `?${r.route.filter}` : ""}`;
const go = (hash: string, c: RouteContext = ctx) => show(resolve(hash, c));

describe("routes", () => {
  it("has exactly two tabs: Events and Teams", () => {
    expect(TABS.map(([k]) => k)).toEqual(["events", "team"]);
  });

  it("opens the most recent tournament, of either competition, by default and for unknown routes", () => {
    expect(go("")).toBe("#/events/u17/2026");
    expect(go("#/")).toBe("#/events/u17/2026");
    expect(go("#/nonsense")).toBe("#/events/u17/2026");
    expect(go("#/events/u17/1999")).toBe("#/events/u17/2026");
    expect(go("#/events/u21")).toBe("#/events/u17/2026");
    expect(go("", { ...ctx, latest: { competition: "U20", year: 2026 } })).toBe("#/events/u20/2026");
  });

  it("renders the competition routes", () => {
    expect(go("#/events/u17")).toBe("events:u17");
    expect(go("#/events/u20")).toBe("events:u20");
    expect(go("#/events/u17/2024")).toBe("events:u17/2024");
    expect(go("#/events/u20/2002")).toBe("events:u20/2002");
    expect(go("#/events/u17/2002")).toBe("#/events/u17/2026"); // 2002 is a U-20 year only
    expect(go("#/team/JPN")).toBe("team:JPN");
    expect(go("#/team/HKG/vs/JPN")).toBe("team:HKG/vs/JPN");
  });

  it("filters a team page by competition with ?c=", () => {
    expect(go("#/team/HKG?c=u20")).toBe("team:HKG?U20");
    expect(go("#/team/HKG/vs/JPN?c=u17")).toBe("team:HKG/vs/JPN?U17");
    expect(go("#/team/HKG?c=both")).toBe("#/team/HKG");
    expect(go("#/team/HKG/vs/JPN?c=x")).toBe("#/team/HKG/vs/JPN");
  });

  it("falls back on bad team codes instead of showing an error", () => {
    expect(go("#/team")).toBe("#/team/HKG");
    expect(go("#/team/XXX")).toBe("#/team/HKG");
    expect(go("#/team/HKG/vs/XXX")).toBe("#/team/HKG");
    expect(go("#/team/HKG/vs/HKG")).toBe("#/team/HKG");
    expect(go("#/team/XXX?c=u20")).toBe("#/team/HKG?c=u20");
  });

  // Old links keep working; they all meant U-17. Each row: old hash -> new hash, in one step.
  const redirects: [string, string][] = [
    ["#/events", "#/events/u17"],
    ["#/events/2024", "#/events/u17/2024"],
    ["#/events/2002", "#/events/u17/2026"], // no U-17 edition in 2002: the landing page
    ["#/overview", "#/events/u17"],
    ["#/edition", "#/events/u17"],
    ["#/edition/2024", "#/events/u17/2024"],
    ["#/h2h", "#/team/HKG"],
    ["#/h2h/JPN", "#/team/JPN"],
    ["#/h2h/XXX", "#/team/HKG"],
    ["#/h2h/JPN/PRK", "#/team/JPN/vs/PRK"],
    ["#/h2h/JPN/JPN", "#/team/JPN"],
    ["#/h2h/JPN/XXX", "#/team/JPN"],
    ["#/matches", "#/events/u17"],
    ["#/matches?year=2024", "#/events/u17/2024"],
    ["#/matches?year=2024&team=JPN", "#/events/u17/2024"], // year wins over team
    ["#/matches?team=JPN&phase=final", "#/team/JPN"],
    ["#/matches?phase=qualifying", "#/events/u17"],
    ["#/matches?q=bali", "#/events/u17"],
    ["#/records", "#/events/u17"],
  ];
  it.each(redirects)("redirects %s to %s", (from, to) => {
    expect(go(from)).toBe(to);
  });

  // Kongming's amendment D on #30: no chains of redirects.
  // Every redirect target above, plus the landing page and the team fallbacks.
  it.each([...new Set([...redirects.map(([, to]) => to), "#/events/u17/2026", "#/team/HKG?c=u20", "#/team/HKG/vs/JPN"])])(
    "%s is a page, reached in one step",
    (target) => {
      const r = resolve(target, ctx);
      expect("route" in r, `${target} redirects again to ${"redirect" in r ? r.redirect : ""}`).toBe(true);
    },
  );
});

describe("latestEvent (the default page), U-17 data", () => {
  const base = loadU17("data");
  // Built from the real U-17 editions so the test doesn't depend on which results have been entered.
  const m = (year: number, phase: "final" | "qualifying"): Match => ({
    competition: "U17", id: `${year}-x`, year, phase, round: "Round 1", group: "A", date: `${year - 1}-10-01`, venue: "", home: "HKG", away: "JPN", hs: 0, as: 1, aet: false, notes: "", source: "",
  });
  const u17 = (year: number) => ({ competition: "U17", year });

  it("is the latest edition with matches: 2026 without any 2027 rows", () => {
    expect(latestEvent(base.editions, [m(2024, "final"), m(2026, "final")])).toEqual(u17(2026));
  });

  it("moves to 2027 as soon as one 2027 match (a qualifier) is in the data", () => {
    expect(latestEvent(base.editions, [m(2024, "final"), m(2026, "final"), m(2027, "qualifying")])).toEqual(u17(2027));
  });

  it("falls back to the latest completed edition when there are no matches", () => {
    expect(latestEvent(base.editions, [])).toEqual(u17(2026));
  });

  it("ignores matches for years with no edition row", () => {
    expect(latestEvent(base.editions, [m(2026, "final"), m(2031, "final")])).toEqual(u17(2026));
  });
});
