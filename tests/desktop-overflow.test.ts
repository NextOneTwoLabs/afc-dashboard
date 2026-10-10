// Desktop overflow (#52): the Biggest wins / Highest-scoring tables were 1171px wide in a 1098px
// card at 1280px because every cell is white-space: nowrap, the venue column at ~315px the widest.
// The real no-sideways-scroll check is done in a headless browser at 1280/1024/768 (see the PR);
// these pin the CSS rules that let a match list shrink to its card above the phone breakpoint.
import { readFileSync } from "node:fs";
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

describe("match tables fit their card above the phone breakpoint (#52)", () => {
  const wide = () => wideBlock();
  it("lets the venue cell wrap", () => {
    expect(rule(wide(), "table.matches td.c-venue")).toMatch(/white-space:\s*normal/);
  });
  it("lets the stage, edition and team cells wrap, so 768px fits too", () => {
    for (const sel of ["table.matches td.c-stage", "table.matches td.c-ed", "table.matches .team"]) {
      expect(rule(wide(), sel), sel).toMatch(/white-space:\s*normal/);
    }
  });
  it("keeps date and score on one line", () => {
    expect(rule(wide(), "table.matches td.c-date, table.matches td.c-score")).toMatch(/white-space:\s*nowrap/);
  });
  it("does not touch the phone block", () => {
    const phone = css.slice(css.indexOf("@media (max-width: 560px) {"));
    expect(phone).not.toMatch(/min-width:\s*561px/);
  });
});
