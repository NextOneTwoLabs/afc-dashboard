// Tablet and narrow-desktop tables (#56): the phone layout from #31 (two-line match rows, summary blocks)
// now also applies whenever a table's CARD is too narrow for it, via CSS container queries on `.card`, not
// only below 560px. The no-sideways-scroll check itself is done in a real browser (see the PR); these pin
// the contract: the card is a container, each query's threshold, which tables are in and out, and that
// the container blocks carry the same layout as the phone block (so the two cannot drift apart).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
/** Every `@container (max-width: Npx)` block: its threshold and its body. */
function containerBlocks(): { max: number; body: string }[] {
  return [...css.matchAll(/@container\s*\(max-width:\s*(\d+)px\)\s*\{/g)].map((m) => ({ max: Number(m[1]), body: body(css, m.index! + m[0].length - 1) }));
}
const phone = (() => {
  const at = css.indexOf("@media (max-width: 560px) {");
  return body(css, css.indexOf("{", at));
})();
/** Declarations of the first rule in `sheet` whose selector list has a selector satisfying `pick`. */
function rule(sheet: string, pick: (selector: string) => boolean): string {
  for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(",").some((s) => pick(s.trim()))) return m[2].replace(/\s+/g, " ").trim();
  return "";
}
const norm = (s: string) => s.replace(/:not\(\.[a-z-]+\)/g, "");
/** The same rule (by selector with its :not() guards removed) in a container block. */
const inBlock = (b: string, selector: string) => rule(b, (s) => norm(s) === selector);

const blockFor = (pick: (b: { max: number; body: string }) => boolean) => containerBlocks().find(pick)?.body ?? "";
const teamMatches = blockFor((b) => /table\.matches:not\(\.no-res\)/.test(b.body));
const eventMatches = blockFor((b) => /table\.matches\.no-res/.test(b.body));
const summaryBlock = blockFor((b) => /table\.summary/.test(b.body));
const columnsBlock = blockFor((b) => /\.hide-sm/.test(b.body));

describe("tablet and narrow-desktop tables use the phone layout when their card is narrow (#56)", () => {
  it("1. every .card is an inline-size container", () => {
    expect(rule(css, (s) => s === ".card")).toMatch(/container-type:\s*inline-size/);
  });

  it("2. there is one container query per kind of table, each with its own threshold", () => {
    expect(teamMatches, "team-page match tables").not.toBe("");
    expect(eventMatches, "event-page match tables").not.toBe("");
    expect(summaryBlock, "summary").not.toBe("");
    expect(columnsBlock, "hide-sm columns").not.toBe("");
    const max = (body: string) => containerBlocks().find((b) => b.body === body)!.max;
    // Below these the card is narrower than the widest tables of the real data (team pages ~1070px, event
    // lists ~860px, summary ~610px, standings and By edition ~520px); above them the desktop layout is kept.
    expect(max(teamMatches)).toBeGreaterThanOrEqual(1000);
    expect(max(teamMatches)).toBeLessThan(1090); // the card of a 1280px viewport is 1090px: Hong Kong's page stays as it is
    expect(max(eventMatches)).toBeGreaterThanOrEqual(870);
    expect(max(eventMatches)).toBeLessThan(max(teamMatches));
    expect(max(summaryBlock)).toBeGreaterThanOrEqual(620);
    expect(max(columnsBlock)).toBeGreaterThanOrEqual(500);
    expect(max(columnsBlock)).toBeLessThan(520); // the half-width card of a 1280px viewport is 520px wide
  });

  it("3. the All events .fit tables are left out of the match queries (they wrap instead, #53)", () => {
    for (const b of [teamMatches, eventMatches]) {
      for (const m of b.matchAll(/([^{}]+)\{/g)) for (const s of m[1].split(",")) if (/table\.matches/.test(s)) expect(s, "selector excludes .fit").toContain(":not(.fit)");
    }
  });

  it("4. match lists: headers visually hidden (not display:none), grid rows, meta line shown, as on phones", () => {
    for (const b of [teamMatches, eventMatches]) {
      const head = inBlock(b, "table.matches thead");
      expect(head).toMatch(/width:\s*1px/);
      expect(head).toMatch(/overflow:\s*hidden/);
      expect(head).toMatch(/clip/);
      expect(head).not.toMatch(/display:\s*none/);
      expect(inBlock(b, "table.matches tbody tr")).toMatch(/display:\s*grid/);
      expect(inBlock(b, "table.matches td.c-meta")).toMatch(/display:\s*block/);
      expect(inBlock(b, "table.matches td.c-date")).toMatch(/display:\s*none/);
      expect(inBlock(b, "table.matches td .team"), "team names wrap beside their flag").toMatch(/white-space:\s*normal/);
    }
    expect(inBlock(teamMatches, "table.matches tbody tr")).toContain('"res home score away"');
    expect(inBlock(eventMatches, "table.matches.no-res tbody tr")).toContain('"home score away"');
  });

  it("5. the container blocks repeat the phone block's declarations for the shared rules (no drift)", () => {
    const shared = [
      "table.matches thead", "table.matches tbody tr:last-child", "table.matches td", "table.matches td.c-meta", "table.matches td.c-venue",
      "table.matches td.c-venue .venue-name", "table.matches td.c-res", "table.matches td.c-home", "table.matches td.c-score", "table.matches td.c-away",
      "table.matches tr.hk", "table.matches tr.hk td", "table.matches tbody tr:hover", "table.matches tbody tr:hover td",
    ];
    for (const b of [teamMatches, eventMatches]) {
      for (const sel of shared) {
        expect(inBlock(b, sel), sel).not.toBe("");
        expect(inBlock(b, sel), sel).toBe(rule(phone, (s) => s === sel));
      }
      expect(inBlock(b, "table.matches tbody tr")).toBe(rule(phone, (s) => s === "table.matches tbody tr"));
    }
    expect(inBlock(eventMatches, "table.matches.no-res tbody tr")).toBe(rule(phone, (s) => s === "table.matches.no-res tbody tr"));
  });

  it("6. Summary: the labelled blocks, header visually hidden, like on phones", () => {
    const head = inBlock(summaryBlock, "table.summary thead");
    expect(head).toMatch(/width:\s*1px/);
    expect(head).toMatch(/clip/);
    expect(head).not.toMatch(/display:\s*none/);
    expect(inBlock(summaryBlock, "table.summary tbody tr")).toMatch(/display:\s*grid/);
    expect(inBlock(summaryBlock, "table.summary td[data-label]::before")).toContain("attr(data-label)");
    for (const sel of ["table.summary thead", "table.summary tbody tr", "table.summary td", "table.summary td.s-comp", "table.summary td[data-label]::before", "table.summary tr.total td"]) {
      expect(inBlock(summaryBlock, sel), sel).toBe(rule(phone, (s) => s === sel));
    }
  });

  it("7. narrow cards drop the secondary columns like phones do: hide-sm / hide-lg and the By edition badge", () => {
    expect(inBlock(columnsBlock, ".hide-sm")).toMatch(/display:\s*none/);
    expect(inBlock(columnsBlock, ".hide-lg")).toMatch(/display:\s*revert/);
    expect(inBlock(columnsBlock, "td .yr-comp")).toMatch(/display:\s*block/);
  });

  it("8. the phone block is untouched: it still carries every table rule", () => {
    for (const sel of ["table.matches thead", "table.matches tbody tr", "table.summary tbody tr", "table.unbeaten tbody tr", "td .yr-comp", ".hide-sm", ".hide-lg", "td .team"]) {
      expect(rule(phone, (s) => s === sel), sel).not.toBe("");
    }
  });
});
