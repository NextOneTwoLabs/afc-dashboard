// Integrity checks on the real dataset in data/. Every rule here guards against a data-entry slip.
import { describe, expect, it } from "vitest";
import { sameEdition } from "../src/model";
import { isKnockout, standings, winner } from "../src/stats";
import { loadDataset, loadU17 } from "./load";

// Every check runs on both competitions: data/ includes data/u20/, and the third set adds a
// small U-20 fixture that shares the year 2099 with the U-17 demo edition.
const DATASETS = [
  ["data", loadDataset("data")],
  ["tests/fixtures", loadDataset("tests/fixtures")],
  ["tests/fixtures + tests/fixtures-u20", loadDataset("tests/fixtures", "tests/fixtures-u20")],
] as const;

for (const [dir, ds] of DATASETS) {
  // An edition is keyed by (competition, year): both competitions use the same years.
  const keys = new Set(ds.editions.map((e) => `${e.competition} ${e.year}`));
  const label = (e: { competition: string; year: number }) => `${e.competition} ${e.year}`;

  describe(`dataset: ${dir}`, () => {
    it("has unique editions per competition and known podium teams", () => {
      expect(keys.size).toBe(ds.editions.length);
      for (const e of ds.editions) {
        for (const t of [e.champion, e.runnerUp, e.third, e.fourth]) {
          if (t) expect(ds.teams.has(t), `${label(e)}: unknown team ${t}`).toBe(true);
        }
        if (e.status !== "completed") expect(e.champion, `${label(e)} has a champion but is ${e.status}`).toBeUndefined();
      }
    });

    it("prefixes U-20 match ids with U20- and no U-17 id (guard)", () => {
      for (const m of ds.matches) expect(m.id.startsWith("U20-"), `match ${m.id} (${m.competition})`).toBe(m.competition === "U20");
    });

    it("has well-formed matches", () => {
      const ids = new Set<string>();
      for (const m of ds.matches) {
        const at = `match ${m.id}`;
        expect(ids.has(m.id), `${at}: duplicate id`).toBe(false);
        ids.add(m.id);
        expect(keys.has(label(m)), `${at}: no edition ${label(m)}`).toBe(true);
        expect(["qualifying", "final"], `${at}: phase`).toContain(m.phase);
        expect(m.date, `${at}: date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(ds.teams.has(m.home), `${at}: unknown team ${m.home}`).toBe(true);
        expect(ds.teams.has(m.away), `${at}: unknown team ${m.away}`).toBe(true);
        expect(m.home, `${at}: team plays itself`).not.toBe(m.away);
        for (const g of [m.hs, m.as]) expect(Number.isInteger(g) && g >= 0, `${at}: score`).toBe(true);
        const pens = m.hp !== undefined || m.ap !== undefined;
        if (pens) {
          expect(m.hs, `${at}: penalties after a decisive score`).toBe(m.as);
          expect(isKnockout(m), `${at}: penalties in a group match`).toBe(true);
          expect(m.hp !== undefined && m.ap !== undefined && m.hp !== m.ap, `${at}: shoot-out score`).toBe(true);
        }
        if (m.aet) expect(isKnockout(m), `${at}: extra time in a group match`).toBe(true);
        if (isKnockout(m)) expect(winner(m), `${at}: knockout match without a winner`).toBeDefined();
      }
    });

    it("agrees with the edition podium where final/third-place matches exist", () => {
      for (const e of ds.editions) {
        const final = ds.matches.find((m) => sameEdition(m, e) && m.phase === "final" && m.round === "Final");
        if (final) {
          const w = winner(final)!;
          expect(e.champion, `${label(e)} champion`).toBe(w);
          expect(e.runnerUp, `${label(e)} runner-up`).toBe(w === final.home ? final.away : final.home);
        }
        const third = ds.matches.find((m) => sameEdition(m, e) && m.phase === "final" && m.round === "Third place");
        if (third) {
          const w = winner(third)!;
          expect(e.third, `${label(e)} third`).toBe(w);
          expect(e.fourth, `${label(e)} fourth`).toBe(w === third.home ? third.away : third.home);
        }
      }
    });

    it("gives every verified edition dates that hold its final-tournament matches", () => {
      for (const e of ds.editions.filter((e) => e.verified)) {
        const at = `${label(e)} (verified)`;
        expect(e.start, `${at}: start`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(e.end, `${at}: end`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(e.start <= e.end, `${at}: start after end`).toBe(true);
        expect(e.start.slice(0, 4), `${at}: start year`).toBe(String(e.year));
        expect(e.end.slice(0, 4), `${at}: end year`).toBe(String(e.year));
        // Qualifiers are played outside these dates (often the year before), so only finals are checked.
        for (const m of ds.matches.filter((m) => sameEdition(m, e) && m.phase === "final")) {
          expect(m.date >= e.start && m.date <= e.end, `${at}: match ${m.id} on ${m.date} outside ${e.start}–${e.end}`).toBe(true);
        }
      }
    });

    it("ranks a round-robin edition (no Final) as its recorded 1st–4th", () => {
      // A completed edition with a champion but no Final was played as one group (2011).
      // Its podium comes from the table, using the AFC tie-breakers in standings().
      for (const e of ds.editions.filter((e) => e.status === "completed" && e.champion)) {
        const finals = ds.matches.filter((m) => sameEdition(m, e) && m.phase === "final");
        if (finals.some((m) => m.round === "Final")) continue;
        const at = `${label(e)} (no Final)`;
        expect(new Set(finals.map((m) => m.group)), `${at}: final phase should be one group`).toEqual(new Set(["A"]));
        const table = standings(finals).map((r) => r.team);
        expect(table.length, `${at}: teams in the table`).toBeGreaterThanOrEqual(4);
        expect(table.slice(0, 4), `${at}: table top four vs podium`).toEqual([e.champion, e.runnerUp, e.third, e.fourth]);
      }
    });
  });
}

// Every finals match of these editions is in the data. Expected counts are the number of
// match boxes on the pinned Wikipedia revision cited in editions.csv (infobox totals agree
// where the page has them). Ids number each year's finals matches by date, and by the
// page's order for matches on the same day; so the Third-place match is n-1 and the Final n.
const FINALS_MATCHES: Record<number, number> = {
  2005: 19, // oldid=1353122133
  2007: 10, // oldid=1314720357
  2009: 16, // oldid=1342516610
  2011: 15, // oldid=1373759728 (infobox: 15 matches)
  2013: 16, // oldid=1353210957
  2015: 16, // oldid=1343950455 (infobox: 16)
  2017: 16, // oldid=1314726875 (infobox: 16)
  2019: 16, // oldid=1354058524 (infobox: 16)
};

describe("U-17 finals completeness", () => {
  const ds = loadU17("data");
  it.each(Object.entries(FINALS_MATCHES))("%s has all its finals matches", (year, n) => {
    const ms = ds.matches.filter((m) => m.year === Number(year) && m.phase === "final");
    expect(ms.length).toBe(n);
    const ids = ms.map((m) => m.id).sort();
    expect(ids).toEqual(Array.from({ length: n }, (_, i) => `${year}-F-${String(i + 1).padStart(2, "0")}`));
  });
});

describe("U-20 rows go through the checks above", () => {
  it("loads the U-20 fixture alongside the U-17 demo data, in the same year", () => {
    const ds = loadDataset("tests/fixtures", "tests/fixtures-u20");
    const u20 = (x: { competition: string }) => x.competition === "U20";
    expect(ds.editions.filter(u20).map((e) => e.year)).toEqual([2099]);
    expect(ds.editions.filter((e) => !u20(e)).map((e) => e.year)).toContain(2099);
    expect(ds.matches.filter(u20)).toHaveLength(8);
    expect(ds.draws.filter(u20)).toHaveLength(3);
  });
});
