import { describe, expect, it } from "vitest";
import { finish, groups, medalTable, record, scoreline, standings, teamSummary, unbeatenRuns } from "../src/stats";
import { loadDataset } from "./load";

const ds = loadDataset("tests/fixtures");
const ed = (y: number) => ds.editions.find((e) => e.year === y)!;

describe("stats on the demo fixture", () => {
  it("builds group tables with points, GD and order", () => {
    const g = groups(ds.matches, 2099, "final").get("Group stage · Group A")!;
    const t = standings(g);
    expect(t.map((r) => r.team)).toEqual(["JPN", "HKG", "KOR", "THA"]);
    expect(t[0]).toMatchObject({ p: 3, w: 2, d: 1, pts: 7, gf: 9, ga: 1, gd: 8 });
    expect(t[1]).toMatchObject({ team: "HKG", pts: 4, gd: -2 });
    expect(t[2]).toMatchObject({ team: "KOR", pts: 4, gd: 1 });
  });

  it("breaks ties on head-to-head before overall goal difference", () => {
    // KOR and HKG both have 4 pts; KOR has the better GD but lost to HKG.
    const rows = standings(groups(ds.matches, 2099, "final").get("Group stage · Group A")!);
    // Mini-league KOR v HKG: HKG won 2-1, so HKG must rank above KOR.
    const order = rows.map((r) => r.team);
    expect(order.indexOf("HKG")).toBeLessThan(order.indexOf("KOR"));
  });

  it("counts a shoot-out as a draw on the record but formats it", () => {
    const sf = ds.matches.find((m) => m.id === "d14")!;
    expect(scoreline(sf)).toBe("1–1 (a.e.t.) (4–3 p)");
    expect(record([sf], "HKG")).toMatchObject({ p: 1, d: 1 });
  });

  it("derives finishes and summaries", () => {
    expect(finish(ds, ed(2099), "HKG")).toBe("Third");
    expect(finish(ds, ed(2099), "THA")).toBe("Group stage");
    expect(finish(ds, ed(2099), "MAC")).toBe("Qualifying");
    expect(finish(ds, ed(2101), "MAC")).toBe("Did not enter");
    const hk = teamSummary(ds, "HKG");
    expect(hk).toMatchObject({ appearances: 2, titles: 0, best: "Runner-up" });
    expect(hk.qualifying).toMatchObject({ p: 2, w: 1, d: 1, gf: 8, ga: 1 });
  });

  it("ranks the medal table by gold, then silver", () => {
    expect(medalTable(ds.editions).slice(0, 3).map((r) => r.team)).toEqual(["PRK", "JPN", "HKG"]);
  });

  it("finds longest unbeaten runs", () => {
    const [top] = unbeatenRuns(ds.matches, ["HKG", "JPN", "PRK"]);
    expect(top).toMatchObject({ team: "JPN", length: 7, ongoing: false });
    expect(top.from.id).toBe("d5");
    expect(top.to.id).toBe("d22");
  });
});
