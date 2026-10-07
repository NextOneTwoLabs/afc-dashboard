import { describe, expect, it } from "vitest";
import { levelPad, ordinalChart, thinLabels } from "../src/charts";
import { FINISHES } from "../src/stats";

// Width of one character of a chart label at the phone font size (21 chart units).
const CHAR = 12.6;

describe("phone-width chart labels (#20)", () => {
  it("thins 10 year labels to at most 6, counting back from the last", () => {
    const shown = thinLabels(10, 6);
    expect(shown).toHaveLength(10);
    expect(shown.filter(Boolean).length).toBeLessThanOrEqual(6);
    expect(shown.filter(Boolean).length).toBeGreaterThanOrEqual(5);
    expect(shown[9]).toBe(true); // the most recent edition is always labelled
    for (let i = 1; i < 10; i++) expect(shown[i] && shown[i - 1], `labels ${i - 1} and ${i} are neighbours`).toBe(false);
    expect(shown).toEqual([false, true, false, true, false, true, false, true, false, true]);
  });

  it("keeps every label when they fit", () => {
    expect(thinLabels(4, 6)).toEqual([true, true, true, true]);
    expect(thinLabels(6, 6).every(Boolean)).toBe(true);
    expect(thinLabels(0, 6)).toEqual([]);
  });

  it("always shows the last label and never two neighbours, for any count", () => {
    for (let n = 1; n <= 30; n++) {
      const s = thinLabels(n, 6);
      expect(s[n - 1], `n=${n}: last`).toBe(true);
      expect(s.filter(Boolean).length, `n=${n}: count`).toBeLessThanOrEqual(6);
      if (n > 6) for (let i = 1; i < n; i++) expect(s[i] && s[i - 1], `n=${n}: ${i - 1},${i}`).toBe(false);
    }
  });

  it("sizes the left margin to the longest level label", () => {
    const longest = Math.max(...FINISHES.map((l) => l.length));
    expect(levelPad(FINISHES)).toBeGreaterThanOrEqual(longest * CHAR);
    expect(levelPad(["A", "B"])).toBe(130); // never narrower than before
  });

  it("marks the thinned year labels in the real chart", () => {
    const pts = Array.from({ length: 10 }, (_, i) => ({ x: String(2005 + 2 * i), y: 0, tip: "" }));
    const svg = ordinalChart(pts, FINISHES, { title: "t" });
    const thin = [...svg.matchAll(/<text[^>]*class="thin"[^>]*>(\d{4})<\/text>/g)].map((m) => m[1]);
    expect(thin).toEqual(["2005", "2009", "2013", "2017", "2021"]);
    // Every level label starts inside the chart: x (right edge, text-anchor end) leaves room for its text.
    for (const m of svg.matchAll(/<text x="([\d.]+)"[^>]*text-anchor="end">([^<]+)<\/text>/g)) {
      expect(Number(m[1]) - m[2].length * CHAR, `level "${m[2]}"`).toBeGreaterThanOrEqual(0);
    }
  });
});
