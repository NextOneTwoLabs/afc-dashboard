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

// Phase 3a (issue #30): U-20 qualifiers, 2006-2013 (the first batch). Counted from the match
// boxes of the pinned Wikipedia "<year> AFC U-19 Women's Championship qualification" revisions
// and reconciled with each page's group tables (these pages have no infobox totals).
// Ids are U20-<year>-Q-R<round>-<group>-<nn>, <nn> being the match's place in its group's
// fixture list (by date, then the page's order on the same day). 2006 was played in four
// zones, stored as groups A-D (North, East, South, West). The 2013 round-2 play-off has no
// group, so its id is U20-2013-Q-R2-PO-01. Withdrawn teams (HKG 2011, KGZ 2013) have no rows.
const QUALIFIERS: Record<number, { oldid: number; groups: Record<string, number>; goals: number }> = {
  2006: { oldid: 1368747898, groups: { "R1-A": 3, "R1-B": 3, "R1-C": 3, "R1-D": 3 }, goals: 68 },
  2007: { oldid: 1367570282, groups: { "R1-A": 10, "R1-B": 6 }, goals: 92 },
  2009: { oldid: 1368748219, groups: { "R1-A": 15, "R1-B": 10 }, goals: 206 },
  2011: { oldid: 1371425101, groups: { "R1-A": 3, "R1-B": 6, "R2-A": 10 }, goals: 82 },
  2013: { oldid: 1371434506, groups: { "R1-A": 3, "R1-B": 6, "R1-C": 6, "R2-A": 6, "R2-B": 6 }, goals: 122 },
};

describe("U-20 qualifiers, 2006-2013", () => {
  const qual = (year: number) => ds.matches.filter((m) => m.year === year && m.phase === "qualifying");

  it.each(Object.entries(QUALIFIERS))("%s has every group's matches, numbered by group", (year, want) => {
    const ms = qual(Number(year));
    const expected = Object.entries(want.groups).flatMap(([key, n]) =>
      Array.from({ length: n }, (_, i) => `U20-${year}-Q-${key.split("-")[0]}-${key.split("-")[1]}-${String(i + 1).padStart(2, "0")}`),
    );
    if (year === "2013") expected.push("U20-2013-Q-R2-PO-01");
    expect(ms.map((m) => m.id).sort()).toEqual(expected.sort());
  });

  it.each(Object.entries(QUALIFIERS))("%s qualifiers have the page's goal total and cite their pinned page", (year, want) => {
    const ms = qual(Number(year));
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.reduce((t, m) => t + m.hs + m.as, 0)).toBe(want.goals);
    for (const m of ms) {
      expect(m.source, m.id).toBe(`https://en.wikipedia.org/w/index.php?title=${year}_AFC_U-19_Women%27s_Championship_qualification&oldid=${want.oldid}`);
    }
  });

  it("has round names and groups that match the ids", () => {
    for (const m of ds.matches.filter((m) => m.phase === "qualifying" && m.year <= 2013)) {
      const [, , , r, g] = m.id.split("-");
      expect(m.round, m.id).toBe(g === "PO" ? "Play-off" : r === "R1" ? "Round 1" : "Round 2");
      expect(m.group, m.id).toBe(g === "PO" ? "" : g);
    }
  });

  it("has the 2013 play-off (MYA beat THA) as the only qualifying knockout match", () => {
    const ko = ds.matches.filter((m) => m.phase === "qualifying" && m.group === "" && m.year <= 2013);
    expect(ko).toHaveLength(1);
    expect(ko[0]).toMatchObject({ id: "U20-2013-Q-R2-PO-01", round: "Play-off", home: "THA", away: "MYA", hs: 0, as: 1 });
  });

  it("gives no rows to teams that withdrew", () => {
    expect(qual(2011).filter((m) => m.home === "HKG" || m.away === "HKG")).toHaveLength(0);
    expect(qual(2013).filter((m) => m.home === "KGZ" || m.away === "KGZ")).toHaveLength(0);
  });

  it("lists Hong Kong's qualifier matches", () => {
    const got = ds.matches.filter((m) => m.phase === "qualifying" && m.year <= 2013 && (m.home === "HKG" || m.away === "HKG")).map((m) => m.id).sort();
    expect(got).toEqual([
      "U20-2006-Q-R1-A-02", "U20-2006-Q-R1-A-03", // oldid 1368747898 (North Zone, in Chinese Taipei)
      "U20-2007-Q-R1-B-02", "U20-2007-Q-R1-B-04", "U20-2007-Q-R1-B-06", // oldid 1367570282
      "U20-2013-Q-R1-C-02", "U20-2013-Q-R1-C-03", "U20-2013-Q-R1-C-05", // oldid 1371434506
    ]);
  });
});

// Phase 3b (issue #30): U-20 qualifiers, 2015-2019. Same method as 2006-2013 above. The pages'
// infoboxes give 18 matches / 85 goals (2015), 18 / 93 (2017) and 49 / 300 (2019: round 1
// 37 / 244, round 2 12 / 56), which the rows equal. Teams listed in a group table with no
// match played have no rows: they withdrew after the draw (2017 LBN, SIN, PAK, PHI; 2019 AFG,
// MNP, PLE), except 2019 SIN, which was moved from group B to group E in the re-draw and played
// there. The 2019 groups as played had A 4, B 4, C 5, D 4, E 4 and F 3 teams.
const QUALIFIERS_B: Record<number, { oldid: number; groups: Record<string, number>; goals: number; absent: Record<string, string[]> }> = {
  2015: { oldid: 1314326577, groups: { "R1-A": 6, "R1-B": 3, "R1-C": 6, "R1-D": 3 }, goals: 85, absent: {} },
  2017: { oldid: 1314327337, groups: { "R1-A": 3, "R1-B": 6, "R1-C": 6, "R1-D": 3 }, goals: 93, absent: { "R1-A": ["LBN", "SIN"], "R1-B": ["PAK"], "R1-D": ["PHI"] } },
  2019: {
    oldid: 1371137299,
    groups: { "R1-A": 6, "R1-B": 6, "R1-C": 10, "R1-D": 6, "R1-E": 6, "R1-F": 3, "R2-A": 6, "R2-B": 6 },
    goals: 300,
    absent: { "R1-A": ["AFG"], "R1-B": ["SIN"], "R1-E": ["MNP"], "R1-F": ["PLE"] },
  },
};

describe("U-20 qualifiers, 2015-2019", () => {
  const qual = (year: number) => ds.matches.filter((m) => m.year === year && m.phase === "qualifying");

  it.each(Object.entries(QUALIFIERS_B))("%s has every group's matches, numbered by group", (year, want) => {
    const expected = Object.entries(want.groups).flatMap(([key, n]) => {
      const [r, g] = key.split("-");
      return Array.from({ length: n }, (_, i) => `U20-${year}-Q-${r}-${g}-${String(i + 1).padStart(2, "0")}`);
    });
    expect(qual(Number(year)).map((m) => m.id).sort()).toEqual(expected.sort());
  });

  it.each(Object.entries(QUALIFIERS_B))("%s qualifiers have the page's goal total and cite their pinned page", (year, want) => {
    const ms = qual(Number(year));
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.reduce((t, m) => t + m.hs + m.as, 0)).toBe(want.goals);
    for (const m of ms) {
      expect(m.source, m.id).toBe(`https://en.wikipedia.org/w/index.php?title=${year}_AFC_U-19_Women%27s_Championship_qualification&oldid=${want.oldid}`);
    }
  });

  it("has round names and groups that match the ids", () => {
    const ms = [2015, 2017, 2019].flatMap(qual);
    expect(ms.length).toBeGreaterThan(0);
    for (const m of ms) {
      const [, , , r, g] = m.id.split("-");
      expect(m.round, m.id).toBe(r === "R1" ? "Round 1" : "Round 2");
      expect(m.group, m.id).toBe(g);
    }
  });

  it("splits 2019 into 37 round-1 matches (244 goals) and 12 round-2 matches (56 goals)", () => {
    const q = qual(2019);
    const r = (round: string) => q.filter((m) => m.round === round);
    expect([r("Round 1").length, r("Round 1").reduce((t, m) => t + m.hs + m.as, 0)]).toEqual([37, 244]);
    expect([r("Round 2").length, r("Round 2").reduce((t, m) => t + m.hs + m.as, 0)]).toEqual([12, 56]);
  });

  it("gives no rows to teams that withdrew or were moved out of a group, in that group", () => {
    for (const [year, want] of Object.entries(QUALIFIERS_B)) {
      expect(qual(Number(year)).length, `${year} has rows`).toBeGreaterThan(0);
      for (const [key, teams] of Object.entries(want.absent)) {
        const [r, g] = key.split("-");
        for (const t of teams) {
          const ms = qual(Number(year)).filter((m) => m.id.includes(`-Q-${r}-${g}-`) && (m.home === t || m.away === t));
          expect(ms, `${year} ${key} ${t}`).toHaveLength(0);
        }
      }
    }
  });

  it("lists Hong Kong's qualifier matches", () => {
    const got = ds.matches.filter((m) => m.phase === "qualifying" && m.year >= 2015 && m.year <= 2019 && (m.home === "HKG" || m.away === "HKG")).map((m) => m.id).sort();
    expect(got).toEqual([
      "U20-2015-Q-R1-C-01", "U20-2015-Q-R1-C-04", "U20-2015-Q-R1-C-05", // oldid 1314326577
      "U20-2017-Q-R1-B-01", "U20-2017-Q-R1-B-03", "U20-2017-Q-R1-B-06", // oldid 1314327337
      "U20-2019-Q-R1-A-02", "U20-2019-Q-R1-A-03", "U20-2019-Q-R1-A-05", // oldid 1371137299
    ]);
  });
});

// Phase 3c (issue #30): U-20 qualifiers, 2024 and 2026 (the last batch).
// 2024 (oldid 1362962221): the infobox adds 36 round-1 matches / 176 goals and 12 round-2 / 44,
// but three of the round-1 matches are Uzbekistan's, the final-tournament hosts, whose games
// "count as friendlies" and are left out of the group tables (E: THA 2-0 UZB, UZB 0-3 TPE,
// TJK 0-4 UZB; 9 goals). They are not stored, so the rows hold 33 + 12 = 45 matches and 211
// goals, and every group table equals the rows. Group E keeps its place numbers from the full
// fixture list (E-01, E-04, E-06), so the friendlies could be added later without renumbering.
// 2026 (oldid 1378820224): 48 matches / 249 goals, as the infobox; every result was also
// checked against the AFC reports linked from the page (www.the-afc.com), which agree.
const QUALIFIERS_C: Record<number, { oldid: number; ids: Record<string, string[]>; goals: number; absent: Record<string, string[]> }> = {
  2024: {
    oldid: 1362962221,
    ids: {
      "R1-A": ["01", "02", "03", "04", "05", "06"],
      "R1-B": ["01", "02", "03"],
      "R1-C": ["01", "02", "03"],
      "R1-D": ["01", "02", "03", "04", "05", "06"],
      "R1-E": ["01", "04", "06"],
      "R1-F": ["01", "02", "03", "04", "05", "06"],
      "R1-G": ["01", "02", "03"],
      "R1-H": ["01", "02", "03"],
      "R2-A": ["01", "02", "03", "04", "05", "06"],
      "R2-B": ["01", "02", "03", "04", "05", "06"],
    },
    goals: 211,
    absent: { "R1-B": ["UAE"], "R1-C": ["IRQ"], "R1-G": ["PAK"] },
  },
  2026: {
    oldid: 1378820224,
    ids: Object.fromEntries("ABCDEFGH".split("").map((g) => [`R1-${g}`, ["01", "02", "03", "04", "05", "06"]])),
    goals: 249,
    absent: {},
  },
};

describe("U-20 qualifiers, 2024 and 2026", () => {
  const qual = (year: number) => ds.matches.filter((m) => m.year === year && m.phase === "qualifying");

  it.each(Object.entries(QUALIFIERS_C))("%s has every group's matches, numbered by group", (year, want) => {
    const expected = Object.entries(want.ids).flatMap(([key, nn]) => nn.map((n) => `U20-${year}-Q-${key.split("-")[0]}-${key.split("-")[1]}-${n}`));
    expect(qual(Number(year)).map((m) => m.id).sort()).toEqual(expected.sort());
  });

  it.each(Object.entries(QUALIFIERS_C))("%s qualifiers have the reconciled goal total and cite their pinned page", (year, want) => {
    const ms = qual(Number(year));
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.reduce((t, m) => t + m.hs + m.as, 0)).toBe(want.goals);
    for (const m of ms) {
      expect(m.source, m.id).toBe(`https://en.wikipedia.org/w/index.php?title=${year}_AFC_U-20_Women%27s_Asian_Cup_qualification&oldid=${want.oldid}`);
    }
  });

  it("has round names and groups that match the ids", () => {
    const ms = [2024, 2026].flatMap(qual);
    expect(ms.length).toBeGreaterThan(0);
    for (const m of ms) {
      const [, , , r, g] = m.id.split("-");
      expect(m.round, m.id).toBe(r === "R1" ? "Round 1" : "Round 2");
      expect(m.group, m.id).toBe(g);
    }
  });

  it("splits 2024 into 33 round-1 matches (167 goals) and 12 round-2 matches (44 goals)", () => {
    const q = qual(2024);
    const r = (round: string) => q.filter((m) => m.round === round);
    expect([r("Round 1").length, r("Round 1").reduce((t, m) => t + m.hs + m.as, 0)]).toEqual([33, 167]);
    expect([r("Round 2").length, r("Round 2").reduce((t, m) => t + m.hs + m.as, 0)]).toEqual([12, 44]);
  });

  it("leaves out Uzbekistan's three 2024 friendlies and teams that withdrew", () => {
    const q = qual(2024);
    expect(q.length).toBeGreaterThan(0);
    expect(q.filter((m) => m.home === "UZB" || m.away === "UZB")).toHaveLength(0);
    for (const [key, teams] of Object.entries(QUALIFIERS_C[2024].absent)) {
      const [r, g] = key.split("-");
      for (const t of teams) {
        expect(q.filter((m) => m.id.includes(`-Q-${r}-${g}-`) && (m.home === t || m.away === t)), `${key} ${t}`).toHaveLength(0);
      }
    }
  });

  it("lists Hong Kong's qualifier matches", () => {
    const got = ds.matches.filter((m) => m.phase === "qualifying" && (m.year === 2024 || m.year === 2026) && (m.home === "HKG" || m.away === "HKG")).map((m) => m.id).sort();
    expect(got).toEqual([
      "U20-2024-Q-R1-A-02", "U20-2024-Q-R1-A-03", "U20-2024-Q-R1-A-05", // oldid 1362962221
      "U20-2026-Q-R1-B-01", "U20-2026-Q-R1-B-04", "U20-2026-Q-R1-B-05", // oldid 1378820224
    ]);
  });

  it("cites the AFC report that was read for every 2026 match", () => {
    const ms = qual(2026);
    expect(ms.length).toBeGreaterThan(0);
    for (const m of ms) expect(m.notes, m.id).toMatch(/AFC report \(read\): https:\/\/www\.the-afc\.com\/en\/national\/afc_u20_womens_asian_cup\.html\/news\//);
  });
});
