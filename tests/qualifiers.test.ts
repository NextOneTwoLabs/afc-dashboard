// Checks for the 2027 qualifiers (issue #9) and a guard against blank scores.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/csv";
import { loadDataset } from "./load";

// 2027 qualifiers draw (16 July 2026), single round-robin per group. Iran was drawn in
// Group C but withdrew, so it has no matches. Source: Wikipedia
// "2027 AFC U-17 Women's Asian Cup qualification", oldid 1378683887.
const DRAW_2027: Record<string, string[]> = {
  A: ["KOR", "JOR", "TJK", "UAE"],
  B: ["IDN", "SIN", "KSA", "BHR"],
  C: ["TPE", "LAO", "CAM"],
  D: ["KGZ", "VIE", "PLE", "MNP"],
  E: ["IND", "MAS", "SYR", "IRQ"],
  F: ["LBN", "THA", "BHU", "MAC"],
  G: ["MYA", "HKG", "GUM"],
  H: ["PHI", "BAN", "UZB"],
};

describe("2027 qualifiers", () => {
  const q = loadDataset("data").matches.filter((m) => m.year === 2027 && m.phase === "qualifying");

  it("has every match in a drawn group, between two teams of that group", () => {
    for (const m of q) {
      const at = `match ${m.id}`;
      expect(m.round, `${at}: round`).toBe("Round 1");
      expect(Object.keys(DRAW_2027), `${at}: group`).toContain(m.group);
      expect(DRAW_2027[m.group], `${at}: ${m.home} not in group ${m.group}`).toContain(m.home);
      expect(DRAW_2027[m.group], `${at}: ${m.away} not in group ${m.group}`).toContain(m.away);
    }
  });

  it("has at least one match in every group", () => {
    for (const g of Object.keys(DRAW_2027)) {
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
