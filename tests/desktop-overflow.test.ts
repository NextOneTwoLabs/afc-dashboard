// Desktop overflow (#52): the Biggest wins / Highest-scoring tables were 1171px wide in a 1098px
// card at 1280px because every cell is white-space: nowrap, the venue column at ~315px the widest.
// The real no-sideways-scroll check is done in a headless browser at 1280/1024/768 (see the PR);
// these pin the CSS rules that let a match list shrink to its card above the phone breakpoint.
import { readFileSync } from "node:fs";
import { events } from "../src/views/events";
import { edition } from "../src/views/edition";
import { team } from "../src/views/team";
import { loadDataset } from "./load";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/style.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the `@media (min-width: 561px)` block (the desktop and tablet widths). */
function wideBlock(): string {
  const start = css.indexOf("@media (min-width: 561px) {");
  expect(start, "a @media (min-width: 561px) block").toBeGreaterThanOrEqual(0);
  let depth = 0;
  let i = css.indexOf("{", start);
  const open = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) break;
  }
  return css.slice(open + 1, i);
}
function rule(sheet: string, selector: string): string {
  for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((s) => s.trim() === selector)) return m[2];
  }
  return "";
}

describe("All events record tables fit their card above the phone breakpoint (#52)", () => {
  it("lets venue, stage and edition wrap in table.fit only", () => {
    for (const sel of ["table.matches.fit td.c-venue", "table.matches.fit td.c-stage", "table.matches.fit td.c-ed"]) {
      expect(rule(wideBlock(), sel), sel).toMatch(/white-space:\s*normal/);
    }
  });
  it("wraps a team name beside its flag (flex), so the flag never drops to its own line", () => {
    const r = rule(wideBlock(), "table.matches.fit .team");
    expect(r).toMatch(/display:\s*inline-flex/);
    expect(rule(wideBlock(), "table.matches.fit .team .flag")).toMatch(/flex:\s*none/);
  });
  it("never applies wrapping to plain match tables (group lists, team pages)", () => {
    for (const m of wideBlock().matchAll(/([^{}]+)\{/g)) {
      for (const sel of m[1].split(",")) expect(sel.trim(), "selector must be scoped to .fit").toMatch(/\.fit\b/);
    }
  });
  it("marks only the All events record tables as fit", () => {
    const ds = loadDataset("tests/fixtures", "tests/fixtures-u20");
    expect(events(ds, "U17")).toMatch(/<table class="matches no-res fit"/);
    expect(edition(ds, "2099", "U20")).not.toMatch(/class="matches[^"]*\bfit\b/);
    expect(team(ds, "HKG")).not.toMatch(/class="matches[^"]*\bfit\b/);
  });
});
