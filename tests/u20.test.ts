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

// Phase 2b (issue #30): 2013-2026. Counts and goal totals are from the pinned Wikipedia
// revisions cited in data/u20/editions.csv (the infobox figures agree with the rows).
const FINALS_MATCHES_B: Record<number, number> = {
  2013: 15, // oldid=1324754201 (single round-robin)
  2015: 16, // oldid=1343950456
  2017: 16, // oldid=1354645926
  2019: 16, // oldid=1354058567
  2024: 16, // oldid=1347722767
  2026: 25, // oldid=1378820207 (12 teams, no third-place match)
};
const FINALS_GOALS_B: Record<number, number> = { 2013: 56, 2015: 73, 2017: 63, 2019: 64, 2024: 70, 2026: 93 };

const PODIUM_B: Record<number, { name: string; host: string; start: string; end: string; podium: (string | undefined)[] }> = {
  2013: { name: "AFC U-19 Women's Championship", host: "China PR", start: "2013-10-11", end: "2013-10-20", podium: ["KOR", "PRK", "CHN", "JPN"] },
  2015: { name: "AFC U-19 Women's Championship", host: "China PR", start: "2015-08-18", end: "2015-08-29", podium: ["JPN", "PRK", "KOR", "CHN"] },
  2017: { name: "AFC U-19 Women's Championship", host: "China PR", start: "2017-10-15", end: "2017-10-28", podium: ["JPN", "PRK", "CHN", "AUS"] },
  2019: { name: "AFC U-19 Women's Championship", host: "Thailand", start: "2019-10-27", end: "2019-11-09", podium: ["JPN", "PRK", "KOR", "AUS"] },
  2024: { name: "AFC U-20 Women's Asian Cup", host: "Uzbekistan", start: "2024-03-03", end: "2024-03-16", podium: ["PRK", "JPN", "AUS", "KOR"] },
  2026: { name: "AFC U-20 Women's Asian Cup", host: "Thailand", start: "2026-04-01", end: "2026-04-18", podium: ["JPN", "PRK", undefined, undefined] },
};

describe("U-20 finals, 2013-2026", () => {
  it.each(Object.entries(FINALS_MATCHES_B))("%s has all its finals matches, numbered U20-<year>-F-<nn>", (year, n) => {
    const ms = finals(Number(year));
    expect(ms.length).toBe(n);
    const ids = ms.map((m) => m.id).sort();
    expect(ids).toEqual(Array.from({ length: n }, (_, i) => `U20-${year}-F-${String(i + 1).padStart(2, "0")}`));
  });

  it.each(Object.entries(FINALS_GOALS_B))("%s finals have %s goals", (year, goals) => {
    expect(finals(Number(year)).reduce((t, m) => t + m.hs + m.as, 0)).toBe(goals);
  });

  it.each(Object.entries(PODIUM_B))("%s has its name, host, dates and podium (verified except 2026)", (year, want) => {
    const e = ds.editions.find((e) => e.year === Number(year));
    expect(e, `U20 ${year} edition`).toBeDefined();
    // 2026 has no third-place match, so its podium can't be fully test-checked: verified stays 0 (as U-17 2026).
    expect(e).toMatchObject({ name: want.name, host: want.host, start: want.start, end: want.end, status: "completed", verified: year !== "2026" });
    expect([e!.champion, e!.runnerUp, e!.third, e!.fourth]).toEqual(want.podium);
    expect(e!.source).toMatch(/^https:\/\/en\.wikipedia\.org\/w\/index\.php\?title=\d{4}_AFC_U-(19_Women%27s_Championship|20_Women%27s_Asian_Cup)&oldid=\d+$/);
  });

  it("keeps 2013 a single round-robin like 2011", () => {
    const ms = finals(2013);
    expect(ms.length).toBeGreaterThan(0);
    expect(new Set(ms.map((m) => m.round))).toEqual(new Set(["Group stage"]));
    expect(new Set(ms.map((m) => m.group))).toEqual(new Set(["A"]));
    expect(ds.editions.find((e) => e.year === 2013)?.notes).toMatch(/single round-robin/i);
  });

  it("has a Final and a Third-place match for 2015, 2017, 2019 and 2024", () => {
    for (const year of [2015, 2017, 2019, 2024]) {
      const rounds = finals(year).map((m) => m.round);
      expect(rounds.filter((r) => r === "Final"), `${year} Final`).toHaveLength(1);
      expect(rounds.filter((r) => r === "Third place"), `${year} Third place`).toHaveLength(1);
      expect(rounds.filter((r) => r === "Semi-final"), `${year} Semi-final`).toHaveLength(2);
    }
  });

  it("has 2026 quarter-finals and no third-place match, with joint semi-finalists in the note", () => {
    const rounds = finals(2026).map((m) => m.round);
    expect(rounds.filter((r) => r === "Group stage")).toHaveLength(18);
    expect(rounds.filter((r) => r === "Quarter-final")).toHaveLength(4);
    expect(rounds.filter((r) => r === "Semi-final")).toHaveLength(2);
    expect(rounds.filter((r) => r === "Final")).toHaveLength(1);
    expect(rounds).not.toContain("Third place");
    expect(ds.editions.find((e) => e.year === 2026)?.notes).toMatch(/joint semi-finalists/i);
  });

  it("records the 2015 final shoot-out and the 2026 extra-time quarter-final", () => {
    expect(finals(2015).find((m) => m.round === "Final")).toMatchObject({ home: "JPN", away: "PRK", hs: 0, as: 0, aet: true, hp: 4, ap: 2 });
    expect(finals(2026).find((m) => m.round === "Quarter-final" && m.home === "THA")).toMatchObject({ away: "KOR", hs: 1, as: 2, aet: true });
  });

  it("lists 2022 as a cancelled edition with no matches", () => {
    const e = ds.editions.find((e) => e.year === 2022);
    expect(e, "U20 2022 edition").toBeDefined();
    expect(e).toMatchObject({ name: "AFC U-20 Women's Asian Cup", host: "Uzbekistan", status: "cancelled" });
    expect(e!.champion).toBeUndefined();
    expect(ds.matches.filter((m) => m.year === 2022)).toHaveLength(0);
    expect(e!.notes).toMatch(/COVID-19/);
  });
});
