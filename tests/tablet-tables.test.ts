// Tablet and narrow-desktop tables (#56): the phone layout from #31 (two-line match rows, summary blocks)
// applies to a table exactly when it cannot fit its card, at any width, not only below 560px. There are no
// width thresholds tuned to the data: src/fit.ts compares each table's natural width with its card and
// toggles `.stack`; the CSS for `.stack` repeats the phone block. The real-browser outcome (no table scrolls
// sideways on any team or event page) is measured in Chromium (see the PR); these pin the contract.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIT_SELECTOR, restack, STACK } from "../src/fit";

const css = readFileSync("src/style.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the block that opens at `css[open]` (the index of its `{`). */
function body(sheet: string, open: number): string {
  let depth = 0;
  for (let i = open; i < sheet.length; i++) {
    if (sheet[i] === "{") depth++;
    else if (sheet[i] === "}" && --depth === 0) return sheet.slice(open + 1, i);
  }
  throw new Error("unclosed block");
}
const phone = (() => {
  const at = css.indexOf("@media (max-width: 560px) {");
  return body(css, css.indexOf("{", at));
})();
/** Declarations of the first rule in `sheet` whose selector list has a selector satisfying `pick`. */
function rule(sheet: string, pick: (selector: string) => boolean, last = false): string {
  const hits = [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].split(",").some((s) => pick(s.trim())));
  const m = last ? hits[hits.length - 1] : hits[0];
  return m ? m[2].replace(/\s+/g, " ").trim() : "";
}
const norm = (s: string) => s.replace(/:not\(\.[a-z-]+\)/g, "").replace(/\.stack\b/g, "");
/** The stacked-table rules: every top-level rule whose selectors all name `.stack`. */
const stackRules = [...css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /\.stack\b/.test(m[1]));
const stackSheet = stackRules.map((m) => `${m[1].trim()} {${m[2]}}`).join("\n");
const inStack = (selector: string, last = false) => rule(stackSheet, (s) => norm(s) === selector, last);

describe("a table stacks exactly when it cannot fit its card (#56)", () => {
  /** A fake table: stacked tables never overflow (that is the point); a wide one overflows its card otherwise. */
  const fake = (natural: number) => {
    const classes = new Set<string>();
    return { natural, classes, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
  };
  const overflowsAt = (card: number) => (t: ReturnType<typeof fake>) => !t.classes.has(STACK) && t.natural > card;

  it("1. stacks the tables wider than their card and leaves the ones that fit", () => {
    const [fits, tight, wide] = [fake(1072), fake(1090), fake(1294)];
    restack([fits, tight, wide], overflowsAt(1090));
    expect(fits.classes.has(STACK)).toBe(false);
    expect(tight.classes.has(STACK)).toBe(false); // exactly as wide as the card: fits
    expect(wide.classes.has(STACK)).toBe(true); // a table nobody tuned a number for
  });

  it("2. measures the natural width: a stacked table is unstacked first, so it can go back to the desktop layout", () => {
    const t = fake(900);
    restack([t], overflowsAt(800));
    expect(t.classes.has(STACK)).toBe(true);
    restack([t], overflowsAt(1000)); // the card grew: the stacked table must not stay stacked
    expect(t.classes.has(STACK)).toBe(false);
    restack([t], overflowsAt(700));
    expect(t.classes.has(STACK)).toBe(true);
  });

  it("3. reads every table before writing any class (one layout pass, no thrash)", () => {
    const log: string[] = [];
    const mk = (n: string) => ({ classList: { add: () => log.push(`add ${n}`), remove: () => log.push(`remove ${n}`) } });
    const [a, b] = [mk("a"), mk("b")];
    restack([a, b], (t) => (log.push(`read ${t === a ? "a" : "b"}`), true));
    expect(log).toEqual(["remove a", "remove b", "read a", "read b", "add a", "add b"]);
  });

  it("4. is a function of the widths alone: repeating it changes nothing", () => {
    const ts = [fake(500), fake(2000), fake(1090)];
    restack(ts, overflowsAt(1090));
    const once = ts.map((t) => t.classes.has(STACK));
    restack(ts, overflowsAt(1090));
    expect(ts.map((t) => t.classes.has(STACK))).toEqual(once);
    expect(once).toEqual([false, true, false]);
  });

  it("5. covers match lists, Summary and the tables with secondary columns, never the All events .fit tables", () => {
    expect(FIT_SELECTOR).toContain("table.matches");
    expect(FIT_SELECTOR).toContain("table.summary");
    expect(FIT_SELECTOR).toContain(".hide-sm");
    expect(FIT_SELECTOR).toMatch(/table\.matches:not\(\.fit\)/);
  });
});

describe("the .stack CSS is the phone layout, with no width thresholds (#56)", () => {
  it("6. there are no container queries and no container-type: nothing is tuned to a pixel width", () => {
    expect(css).not.toMatch(/@container/);
    expect(css).not.toMatch(/container-type/);
  });

  it("7. match lists: headers visually hidden (not display:none), grid rows, meta line first and shown", () => {
    const head = inStack("table.matches thead");
    expect(head).toMatch(/width:\s*1px/);
    expect(head).toMatch(/overflow:\s*hidden/);
    expect(head).toMatch(/clip/);
    expect(head).not.toMatch(/display:\s*none/);
    expect(inStack("table.matches tbody tr")).toMatch(/display:\s*grid/);
    expect(inStack("table.matches tbody tr")).toContain('"res home score away"');
    expect(inStack("table.matches.no-res tbody tr", true)).toContain('"home score away"');
    expect(inStack("table.matches td.c-meta")).toMatch(/display:\s*block/);
    expect(inStack("table.matches td.c-date")).toMatch(/display:\s*none/);
    expect(inStack("table td .team")).toMatch(/white-space:\s*normal/);
  });

  it("8. the .stack rules repeat the phone block's declarations (no drift)", () => {
    const shared = [
      "table.matches thead", "table.matches tbody tr", "table.matches tbody tr:last-child", "table.matches td", "table.matches td.c-meta", "table.matches td.c-venue",
      "table.matches td.c-venue .venue-name", "table.matches td.c-res", "table.matches td.c-home", "table.matches td.c-score", "table.matches td.c-away",
      "table.matches tr.hk", "table.matches tr.hk td", "table.matches tbody tr:hover", "table.matches tbody tr:hover td",
      "table.summary thead", "table.summary tbody tr", "table.summary tbody tr:last-child", "table.summary tbody tr.total", "table.summary td", "table.summary td.s-comp",
      "table.summary td[data-label]::before", "table.summary tr.total td", "table.summary tbody tr:hover",
    ];
    for (const sel of shared) {
      expect(inStack(sel), sel).not.toBe("");
      expect(inStack(sel), sel).toBe(rule(phone, (s) => s === sel));
    }
    expect(inStack("table.matches.no-res tbody tr", true)).toBe(rule(phone, (s) => s === "table.matches.no-res tbody tr"));
  });

  it("9. Summary keeps its visually hidden header and labelled blocks", () => {
    const head = inStack("table.summary thead");
    expect(head).toMatch(/width:\s*1px/);
    expect(head).not.toMatch(/display:\s*none/);
    expect(inStack("table.summary tbody tr")).toMatch(/display:\s*grid/);
    expect(inStack("table.summary td[data-label]::before")).toContain("attr(data-label)");
  });

  it("10. a stacked standings or By edition table drops the secondary columns like phones do", () => {
    expect(inStack("table .hide-sm")).toMatch(/display:\s*none/);
    expect(inStack("table .hide-lg")).toMatch(/display:\s*revert/);
    expect(inStack("table td .yr-comp")).toMatch(/display:\s*block/);
    expect(inStack("table td .team")).toMatch(/white-space:\s*normal/);
    expect(rule(stackSheet, (s) => s.includes(":has(.hide-sm)") && /\btd\b/.test(s))).toMatch(/padding:\s*8px 4px/);
  });

  it("11. that cell padding comes before the stacked tables' own rules, so their padding:0 still wins", () => {
    const pad = css.search(/:has\(\.hide-sm\)[^{]*\{[^}]*padding/);
    expect(pad).toBeGreaterThan(0);
    expect(pad).toBeLessThan(css.search(/table\.matches\.stack[^{]*td\s*\{/));
    expect(pad).toBeLessThan(css.search(/table\.summary\.stack[^{]*td\s*\{/));
  });

  it("12. the phone block is untouched: it still carries every table rule", () => {
    for (const sel of ["table.matches thead", "table.matches tbody tr", "table.summary tbody tr", "table.unbeaten tbody tr", "td .yr-comp", ".hide-sm", ".hide-lg", "td .team"]) {
      expect(rule(phone, (s) => s === sel), sel).not.toBe("");
    }
  });
});
