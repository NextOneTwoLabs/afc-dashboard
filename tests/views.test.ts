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

  it("an event page links back to its competition's events", () => {
    // #39: the back link is now the page head's breadcrumb, as in the approved mockup.
    expect(edition(ds, "2099")).toMatch(/<nav class="breadcrumb"[^>]*><a href="#\/events\/u17">All U-17 events<\/a>/);
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

  it("labels the editions tile as editions held", () => {
    expect(events(ds)).toContain("Editions held");
  });

  it("ignores an invalid or identical opponent", () => {
    expect(team(ds, "HKG", "HKG")).not.toContain("compared with");
    expect(team(ds, "HKG", "XXX")).not.toContain("compared with");
  });
});

// Old routes still redirect, but internal links must use the new ones: no #/edition, #/h2h,
// #/matches, #/records or #/overview, and no #/events/<year> without its competition (#30).
const STALE = /href="#\/((edition|h2h|matches|records|overview)\b|events\/\d|events")/;
const SETS = [
  ["data", loadDataset("data")],
  ["tests/fixtures", loadDataset("tests/fixtures")],
  ["tests/fixtures + tests/fixtures-u20", loadDataset("tests/fixtures", "tests/fixtures-u20")],
] as const;
for (const [dir, ds] of SETS) {
  describe(`no links to old routes (${dir})`, () => {
    const pages: [string, string][] = [
      ["events U-17", events(ds, "U17")],
      ["events U-20", events(ds, "U20")],
      ...ds.editions.map((e): [string, string] => [`event ${e.competition} ${e.year}`, edition(ds, String(e.year), e.competition)]),
      ...activeTeams(ds).map((t): [string, string] => [`team ${t}`, team(ds, t, t === "JPN" ? "PRK" : "JPN")]),
    ];
    it.each(pages)("%s", (_name, html) => {
      expect(html).not.toMatch(STALE);
    });
  });
}

describe("2027 event page while only qualifiers are in the data", () => {
  const real = loadDataset("data");
  const html = edition(real, "2027");
  const groupTable = (h: string, g: string) => {
    const start = h.indexOf(`Round 1 · Group ${g}<`);
    return start < 0 ? "" : h.slice(start, h.indexOf("</table>", start));
  };

  it("shows a one-line note instead of the 'not played yet' box", () => {
    expect(html).not.toContain("hasn't been played yet");
    expect(html).toContain("Final tournament not yet held");
  });

  it("still marks a cancelled edition as cancelled", () => {
    expect(edition(real, "2022")).toContain("This edition was cancelled.");
  });

  it("lists drawn teams that have not played yet in their group table", () => {
    const g = groupTable(html, "G");
    expect(g, "Group G table").not.toBe("");
    for (const name of ["Myanmar", "Guam", "Hong Kong"]) expect(g, `Group G lists ${name}`).toContain(name);
  });
});

// Phase 1b of #30, per the approved mockup: the demo U-17 fixture (2099, 2101) plus the
// U-20 fixture (2099 only).
describe("U-17 / U-20 on the pages", () => {
  const ds = loadDataset("tests/fixtures", "tests/fixtures-u20");
  const seg = (html: string) => /<div class="seg"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
  const link = (html: string, label: string) => new RegExp(`<a [^>]*href="([^"]*)"[^>]*>${label}</a>`).exec(seg(html))?.[1];
  const current = (html: string) => /<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/.exec(seg(html))?.[1];

  it("All events has a heading, a switch and year chips per competition", () => {
    const u20 = events(ds, "U20");
    expect(u20).toContain("<h1>All events · U-20</h1>");
    expect(current(u20)).toBe("U-20");
    expect(link(u20, "U-17")).toBe("#/events/u17");
    expect(u20).toContain('href="#/events/u20/2099"');
    expect(u20).not.toContain('href="#/events/u20/2101"');
    expect(events(ds, "U17")).toContain("<h1>All events · U-17</h1>");
  });

  it("an event page switches to the other competition's same year, else to its latest", () => {
    const u20 = edition(ds, "2099", "U20");
    expect(u20).toMatch(/<nav class="breadcrumb"[^>]*><a href="#\/events\/u20">All U-20 events<\/a>/);
    expect(current(u20)).toBe("U-20");
    expect(link(u20, "U-17")).toBe("#/events/u17/2099"); // U-17 has a 2099 edition
    expect(link(edition(ds, "2101", "U17"), "U-20")).toBe("#/events/u20/2099"); // no U-20 2101: its latest
  });

  it("a team page sums up each competition, with a total", () => {
    const html = team(ds, "HKG");
    const summary = /<h2>Summary by competition<\/h2>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
    expect(summary).toMatch(/U-17[\s\S]*U-20[\s\S]*Total/);
    expect(html.match(/<h2>Finish by edition/g)).toHaveLength(2); // one chart per competition
    expect(html).toMatch(/<th>Competition<\/th>/);
    expect(html).toContain("U-20 2099"); // match tables name the competition
    expect(current(html)).toBe("Both");
    expect(link(html, "U-20")).toBe("#/team/HKG?c=u20");
  });

  it("the team filter narrows the whole page to one competition", () => {
    const html = team(ds, "HKG", "JPN", "U20");
    expect(current(html)).toBe("U-20");
    expect(link(html, "Both")).toBe("#/team/HKG/vs/JPN");
    expect(html).not.toContain(">Total<");
    expect(html.match(/<h2>Finish by edition/g)).toHaveLength(1);
    expect(html).not.toContain("U-17 2101");
    expect(html).toContain("U-20 2099");
  });
});
