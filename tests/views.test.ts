// The views are pure functions returning HTML strings, so they can be rendered without a DOM.
import { describe, expect, it } from "vitest";
import { edition } from "../src/views/edition";
import { events } from "../src/views/events";
import { team } from "../src/views/team";
import { activeTeams } from "../src/stats";
import { loadDataset } from "./load";

describe("views on the demo fixture", () => {
  const ds = loadDataset("tests/fixtures");

  it("Events overview has the medal table and all-time records, and no spotlight card", () => {
    const html = events(ds);
    expect(html).toContain("Medal table");
    expect(html).toContain("All-time records");
    expect(html).toContain("Longest unbeaten runs");
    expect(html.toLowerCase()).not.toContain("spotlight");
  });

  it("an event page links back to all events", () => {
    expect(edition(ds, "2099")).toContain('href="#/events"');
  });

  it("Teams shows the comparison only when an opponent is picked", () => {
    const vs = team(ds, "HKG", "JPN");
    expect(vs).toContain("compared with");
    expect(vs).toContain("Meetings");
    expect(vs).toContain('id="compare-pick"');
    const plain = team(ds, "HKG");
    expect(plain).not.toContain("compared with");
    expect(plain).not.toContain("Meetings");
    expect(plain).toContain("Biggest wins");
    expect(plain).toContain("Longest unbeaten run");
  });

  it("ignores an invalid or identical opponent", () => {
    expect(team(ds, "HKG", "HKG")).not.toContain("compared with");
    expect(team(ds, "HKG", "XXX")).not.toContain("compared with");
  });
});

// Old routes still redirect, but internal links must use the new ones.
const STALE = /href="#\/(edition|h2h|matches|records|overview)\b/;
for (const dir of ["data", "tests/fixtures"] as const) {
  describe(`no links to old routes (${dir})`, () => {
    const ds = loadDataset(dir);
    const pages: [string, string][] = [
      ["events", events(ds)],
      ...ds.editions.map((e): [string, string] => [`event ${e.year}`, edition(ds, String(e.year))]),
      ...activeTeams(ds).map((t): [string, string] => [`team ${t}`, team(ds, t, t === "JPN" ? "PRK" : "JPN")]),
    ];
    it.each(pages)("%s", (_name, html) => {
      expect(html).not.toMatch(STALE);
    });
  });
}
