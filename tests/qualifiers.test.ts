// Checks for the qualifiers (issues #9 and #16) and a guard against blank scores.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/csv";
import { loadDataset } from "./load";

// All qualifier matches and goals for 2024 and 2026 (issue #16, PR B4), from the pinned
// Wikipedia revisions (2024: oldid 1343613819, 2026: oldid 1364402581), checked against the
// AFC reports where www.the-afc.com has them and reconciled with each page's group tables.
// 2026 NMI v AUS (group E) was awarded 3–0 to NMI by the AFC; the group tables count the
// awarded result, so 2026 has 154 goals. The 2026 infobox's 173 counts the 0–22 played on
// the pitch instead (154 − 3 + 22 = 173).
const QUALIFIERS_B4: Record<number, { rounds: Record<string, number>; goals: number }> = {
  2024: { rounds: { "Round 1": 24, "Round 2": 12 }, goals: 195 },
  2026: { rounds: { "Round 1": 30 }, goals: 154 },
};

describe("qualifiers, 2024 and 2026", () => {
  const q = loadDataset("data").matches.filter((m) => m.phase === "qualifying");
  for (const [year, { rounds, goals }] of Object.entries(QUALIFIERS_B4)) {
    const ms = q.filter((m) => m.year === Number(year));
    for (const [round, n] of Object.entries(rounds)) {
      it(`has all ${n} ${round} qualifier matches for ${year}`, () => {
        expect(ms.filter((m) => m.round === round), `${year} ${round} matches`).toHaveLength(n);
      });
    }
    it(`has ${goals} qualifier goals for ${year}`, () => {
      expect(ms.reduce((t, m) => t + m.hs + m.as, 0)).toBe(goals);
    });
  }

  it("records the awarded 2026 NMI v AUS match as 3–0", () => {
    const m = q.find((x) => x.id === "2026-Q-R1-E-01");
    expect(m).toMatchObject({ home: "MNP", away: "AUS", hs: 3, as: 0 });
    expect(m?.notes).toMatch(/awarded/i);
  });
});

// 2027 qualifiers draw (16 July 2026), single round-robin per group. The draw itself is
// data (data/draws.csv); this is an independent check of its shape against the source,
// Wikipedia "2027 AFC U-17 Women's Asian Cup qualification", oldid 1378683887: 8 groups,
// 29 teams. Iran was drawn in Group C but withdrew, so it is not in the draw file.
const DRAW_2027_SIZES: Record<string, number> = { A: 4, B: 4, C: 3, D: 4, E: 4, F: 4, G: 3, H: 3 };

describe("2027 qualifiers", () => {
  const ds = loadDataset("data");
  const q = ds.matches.filter((m) => m.year === 2027 && m.phase === "qualifying");
  const draw = (ds.draws ?? []).filter((d) => d.year === 2027 && d.phase === "qualifying" && d.round === "Round 1");
  const inGroup = (g: string) => draw.filter((d) => d.group === g).map((d) => d.team);

  it("has a draw of 8 groups and 29 teams, without Iran", () => {
    const sizes = Object.fromEntries(Object.keys(DRAW_2027_SIZES).map((g) => [g, inGroup(g).length]));
    expect(sizes).toEqual(DRAW_2027_SIZES);
    expect(draw).toHaveLength(29);
    expect(new Set(draw.map((d) => d.team)).size, "a team drawn twice").toBe(29);
    expect(draw.map((d) => d.team)).not.toContain("IRN");
    for (const d of draw) expect(ds.teams.has(d.team), `unknown team ${d.team}`).toBe(true);
  });

  it("has every match in a drawn group, between two teams of that group", () => {
    for (const m of q) {
      const at = `match ${m.id}`;
      expect(m.round, `${at}: round`).toBe("Round 1");
      expect(Object.keys(DRAW_2027_SIZES), `${at}: group`).toContain(m.group);
      expect(inGroup(m.group), `${at}: ${m.home} not in group ${m.group}`).toContain(m.home);
      expect(inGroup(m.group), `${at}: ${m.away} not in group ${m.group}`).toContain(m.away);
    }
  });

  it("has at least one match in every group", () => {
    for (const g of Object.keys(DRAW_2027_SIZES)) {
      expect(q.some((m) => m.group === g), `group ${g} has no matches`).toBe(true);
    }
  });

  it("plays each pair at most once per group", () => {
    const seen = new Set<string>();
    for (const m of q) {
      const key = `${m.group}:${[m.home, m.away].sort().join("-")}`;
      expect(seen.has(key), `match ${m.id}: repeated pair ${key}`).toBe(false);
      seen.add(key);
    }
  });
});

// The model reads scores with Number(), and Number("") is 0, so a blank score would
// silently become a 0–0 draw. Check the raw CSV fields instead.
for (const dir of ["data", "tests/fixtures"]) {
  it(`${dir}/matches.csv has a numeric score on every row`, () => {
    const rows = parseCsv(readFileSync(resolve(__dirname, "..", dir, "matches.csv"), "utf8"));
    for (const r of rows) {
      expect(r.hs, `match ${r.id}: hs`).toMatch(/^\d+$/);
      expect(r.as, `match ${r.id}: as`).toMatch(/^\d+$/);
    }
  });
}

// Hong Kong's qualifier matches for past editions (issue #16), from the pinned Wikipedia
// revisions of each "<edition> AFC U-16 Women's Championship qualification" /
// "AFC U-17 Women's Asian Cup qualification" page. Ids are <year>-Q-R<round>-<group>-<nn>,
// where <nn> is the match's place in its group's full fixture list (by date, then the
// page's order on the same day), so the rest of each group fits in without renumbering.
const HKG_QUALIFIERS: Record<number, string[]> = {
  // oldid 1371433914 (Group D, in Guam)
  2013: ["2013-Q-R1-D-01", "2013-Q-R1-D-02"],
  // oldid 1332487635
  2015: ["2015-Q-R1-C-02", "2015-Q-R1-C-04", "2015-Q-R1-C-06"],
  // oldid 1373231566
  2017: ["2017-Q-R1-D-02", "2017-Q-R1-D-05", "2017-Q-R1-D-08", "2017-Q-R1-D-10", "2017-Q-R1-D-15"],
  // oldid 1355020762 (first round only; Hong Kong did not reach round 2)
  2019: ["2019-Q-R1-B-01", "2019-Q-R1-B-04", "2019-Q-R1-B-07", "2019-Q-R1-B-09"],
  // oldid 1343613819 (first round only)
  2024: ["2024-Q-R1-E-02", "2024-Q-R1-E-03"],
  // oldid 1364402581
  2026: ["2026-Q-R1-D-02", "2026-Q-R1-D-03"],
};

describe("Hong Kong qualifiers, past editions", () => {
  const ms = loadDataset("data").matches.filter((m) => m.phase === "qualifying" && (m.home === "HKG" || m.away === "HKG"));

  for (const [year, ids] of Object.entries(HKG_QUALIFIERS)) {
    it(`has Hong Kong's ${ids.length} qualifier matches for ${year}`, () => {
      const got = ms.filter((m) => m.year === Number(year)).map((m) => m.id).sort();
      expect(got, `${year} Hong Kong qualifier ids`).toEqual([...ids].sort());
    });
  }
});
