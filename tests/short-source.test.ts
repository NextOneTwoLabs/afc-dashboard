// Long source URLs in notes (#61): the U-20 2004 banner and match notes carried a ~400-character
// percent-encoded ko.wikipedia URL that showed as raw text. Notes now use the short permalink form
// (same pinned revision) and the banner renders URLs as short labelled links.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { edition } from "../src/views/edition";
import { loadDataset } from "./load";

const SHORT = "https://ko.wikipedia.org/w/index.php?oldid=39215969";
const ds = loadDataset("data");

describe("2004 source note shows a short link (#61)", () => {
  const html = edition(ds, "2004", "U20");
  const banner = html.match(/<div class="banner">([\s\S]*?)<\/div>/)![1];

  it("links the pinned ko.wikipedia revision with a short label", () => {
    expect(banner).toContain(`<a href="${SHORT}" target="_blank" rel="noopener">ko.wikipedia.org ↗</a>`);
  });
  it("shows no run of 60+ non-space characters as visible text", () => {
    const visible = banner.replace(/<[^>]*>/g, "");
    expect(visible).not.toMatch(/\S{60,}/);
  });
  it("keeps the revision id in the visible text", () => {
    expect(banner).toContain("oldid 39215969");
  });
});

describe("data uses the short form (#61)", () => {
  for (const f of ["data/u20/editions.csv", "data/u20/matches.csv"]) {
    it(`${f} has no long ko.wikipedia URL`, () => {
      const urls = readFileSync(f, "utf8").match(/https:\/\/ko\.wikipedia\.org[^\s,)"]*/g) ?? [];
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) expect(u).toBe(SHORT);
    });
  }
});

describe("note links are safe", () => {
  it("only http(s) URLs become links and data is escaped", () => {
    const d = loadDataset("data");
    const ed = d.editions.find((e) => e.competition === "U20" && e.year === 2004)!;
    ed.notes = `x <b>y</b> javascript:alert(1) https://a.example/p?q=1&r="2" ftp://z`;
    const out = edition(d, "2004", "U20");
    expect(out).not.toContain("<b>y</b>");
    expect(out).not.toMatch(/href="javascript/);
    expect(out).not.toMatch(/href="ftp/);
    expect(out).toContain(`href="https://a.example/p?q=1&amp;r=&quot;2&quot;"`);
  });
});
