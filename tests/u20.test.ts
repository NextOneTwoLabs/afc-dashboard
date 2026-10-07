// U-20 family final tournaments, 2002-2011 (the AFC U-19 Women's Championship era; issue #30, phase 2a).
// Counts and goal totals come from the pinned Wikipedia revisions cited in data/u20/editions.csv.
// 2004 is not in this batch: its Wikipedia page gives no match dates and no AFC report could be read.
import { describe, expect, it } from "vitest";
import { forCompetition } from "../src/model";
import { loadDataset } from "./load";

const ds = forCompetition(loadDataset("data"), "U20");
const finals = (year: number) => ds.matches.filter((m) => m.year === year && m.phase === "final");

const FINALS_MATCHES: Record<number, number> = {
  2002: 22, // oldid=1314715450 (infobox: 22)
  2006: 16, // oldid=1374976951 (infobox: 16)
  2007: 16, // oldid=1374976920 (infobox: 16)
  2009: 16, // oldid=1371410471 (infobox: 16)
  2011: 15, // oldid=1371419336 (infobox: 15; single round-robin)
};

// Goals rebuilt from the rows. They equal the infobox except 2002, where the page's group
// tables and match boxes add up to 162 but the infobox says 161.
const FINALS_GOALS: Record<number, number> = { 2002: 162, 2006: 112, 2007: 50, 2009: 48, 2011: 56 };

const PODIUM: Record<number, { host: string; start: string; end: string; podium: string[] }> = {
  2002: { host: "India", start: "2002-04-19", end: "2002-04-28", podium: ["JPN", "TPE", "CHN", "PRK"] },
  2006: { host: "Malaysia", start: "2006-04-08", end: "2006-04-18", podium: ["CHN", "PRK", "AUS", "JPN"] },
  2007: { host: "China PR", start: "2007-10-05", end: "2007-10-16", podium: ["PRK", "JPN", "CHN", "KOR"] },
  2009: { host: "China PR", start: "2009-08-01", end: "2009-08-12", podium: ["JPN", "KOR", "PRK", "CHN"] },
  2011: { host: "Vietnam", start: "2011-10-06", end: "2011-10-16", podium: ["JPN", "PRK", "CHN", "KOR"] },
};

describe("U-20 finals, 2002-2011", () => {
  it.each(Object.entries(FINALS_MATCHES))("%s has all its finals matches, numbered U20-<year>-F-<nn>", (year, n) => {
    const ms = finals(Number(year));
    expect(ms.length).toBe(n);
    const ids = ms.map((m) => m.id).sort();
    expect(ids).toEqual(Array.from({ length: n }, (_, i) => `U20-${year}-F-${String(i + 1).padStart(2, "0")}`));
  });

  it.each(Object.entries(FINALS_GOALS))("%s finals have %s goals", (year, goals) => {
    expect(finals(Number(year)).reduce((t, m) => t + m.hs + m.as, 0)).toBe(goals);
  });

  it.each(Object.entries(PODIUM))("%s has its host, dates and podium, verified", (year, want) => {
    const e = ds.editions.find((e) => e.year === Number(year));
    expect(e, `U20 ${year} edition`).toBeDefined();
    expect(e).toMatchObject({ host: want.host, start: want.start, end: want.end, status: "completed", verified: true });
    expect([e!.champion, e!.runnerUp, e!.third, e!.fourth]).toEqual(want.podium);
    expect(e!.source).toMatch(/^https:\/\/en\.wikipedia\.org\/w\/index\.php\?title=\d{4}_AFC_U-19_Women%27s_Championship&oldid=\d+$/);
  });

  it("has a Final and a Third-place match in every knockout edition, but not in 2011", () => {
    for (const year of [2002, 2006, 2007, 2009]) {
      const rounds = finals(year).map((m) => m.round);
      expect(rounds.filter((r) => r === "Final"), `${year} Final`).toHaveLength(1);
      expect(rounds.filter((r) => r === "Third place"), `${year} Third place`).toHaveLength(1);
      expect(rounds.filter((r) => r === "Semi-final"), `${year} Semi-final`).toHaveLength(2);
    }
    const r2011 = finals(2011);
    expect(r2011.length).toBeGreaterThan(0);
    expect(new Set(r2011.map((m) => m.round))).toEqual(new Set(["Group stage"]));
    expect(new Set(r2011.map((m) => m.group))).toEqual(new Set(["A"]));
    expect(ds.editions.find((e) => e.year === 2011)?.notes).toMatch(/single round-robin/i);
  });

  it("records the 2002 and 2006-07 semi-final shoot-outs", () => {
    const sf = (year: number) => finals(year).filter((m) => m.round === "Semi-final");
    expect(sf(2002).map((m) => [m.home, m.away, m.hs, m.as, m.aet, m.hp, m.ap])).toEqual([
      ["JPN", "CHN", 1, 1, true, 3, 0],
      ["TPE", "PRK", 1, 1, true, 4, 3],
    ]);
    expect(sf(2006).find((m) => m.home === "JPN")).toMatchObject({ away: "CHN", hs: 1, as: 1, hp: 3, ap: 5 });
    expect(sf(2007).find((m) => m.home === "KOR")).toMatchObject({ away: "JPN", hs: 0, as: 0, hp: 5, ap: 6 });
  });
});
