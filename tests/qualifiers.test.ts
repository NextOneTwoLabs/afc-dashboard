// Checks for the 2027 qualifiers (issue #9) and a guard against blank scores.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/csv";
import { loadDataset } from "./load";

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
