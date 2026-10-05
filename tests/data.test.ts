// Integrity checks on the real dataset in data/. Every rule here guards against a data-entry slip.
import { describe, expect, it } from "vitest";
import { isKnockout, winner } from "../src/stats";
import { loadDataset } from "./load";

for (const dir of ["data", "tests/fixtures"] as const) {
  const ds = loadDataset(dir);
  const years = new Set(ds.editions.map((e) => e.year));

  describe(`dataset: ${dir}`, () => {
    it("has unique edition years and known podium teams", () => {
      expect(years.size).toBe(ds.editions.length);
      for (const e of ds.editions) {
        for (const t of [e.champion, e.runnerUp, e.third, e.fourth]) {
          if (t) expect(ds.teams.has(t), `${e.year}: unknown team ${t}`).toBe(true);
        }
        if (e.status !== "completed") expect(e.champion, `${e.year} has a champion but is ${e.status}`).toBeUndefined();
      }
    });

    it("has well-formed matches", () => {
      const ids = new Set<string>();
      for (const m of ds.matches) {
        const at = `match ${m.id}`;
        expect(ids.has(m.id), `${at}: duplicate id`).toBe(false);
        ids.add(m.id);
        expect(years.has(m.year), `${at}: no edition ${m.year}`).toBe(true);
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
        const final = ds.matches.find((m) => m.year === e.year && m.phase === "final" && m.round === "Final");
        if (final) {
          const w = winner(final)!;
          expect(e.champion, `${e.year} champion`).toBe(w);
          expect(e.runnerUp, `${e.year} runner-up`).toBe(w === final.home ? final.away : final.home);
        }
        const third = ds.matches.find((m) => m.year === e.year && m.phase === "final" && m.round === "Third place");
        if (third) {
          const w = winner(third)!;
          expect(e.third, `${e.year} third`).toBe(w);
          expect(e.fourth, `${e.year} fourth`).toBe(w === third.home ? third.away : third.home);
        }
      }
    });
  });
}
