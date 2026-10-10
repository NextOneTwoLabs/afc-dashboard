// Phone layout for match lists and the team page's tables (#31). The views are pure HTML
// strings and the layout is CSS, so these pin the markup contract and the CSS rules; the
// no-sideways-scroll check itself is done in a real 360px browser (see the PR).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMP } from "../src/competitions";
import { edition } from "../src/views/edition";
import { team } from "../src/views/team";
import { fmtDate, phaseLabel } from "../src/ui";
import { isKnockout } from "../src/stats";
import { loadDataset } from "./load";

const ds = loadDataset("tests/fixtures", "tests/fixtures-u20");
const css = readFileSync("src/style.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

const strip = (h: string) => h.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const card = (html: string, title: string) => new RegExp(`<h2>${title}[\\s\\S]*?</h2>([\\s\\S]*?)</table>`).exec(html)?.[1] ?? "";
const tbodyRows = (tableHtml: string) => [...(/<tbody[\s\S]*<\/tbody>/.exec(tableHtml)?.[0] ?? "").matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => r[1]);
const cell = (row: string, cls: string) => new RegExp(`<td class="${cls}[ "][^>]*>([\\s\\S]*?)</td>`).exec(row)?.[1];

/** The block of `@media (max-width: 560px)`, and the stylesheet without it. */
function phoneBlock(): { phone: string; rest: string } {
  const start = css.indexOf("@media (max-width: 560px) {");
  expect(start, "phone media query").toBeGreaterThanOrEqual(0);
  let depth = 0;
  let i = css.indexOf("{", start);
  const open = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) break;
  }
  return { phone: css.slice(open + 1, i), rest: css.slice(0, start) + css.slice(i + 1) };
}
/** The declarations of the first rule in `sheet` whose selector list includes `selector`. */
function rule(sheet: string, selector: string): string {
  for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((s) => s.trim() === selector)) return m[2];
  }
  return "";
}

const html = team(ds, "HKG");
const allMatches = card(html, "All matches");
const hkMatches = ds.matches.filter((m) => m.home === "HKG" || m.away === "HKG");

describe("match lists get a stackable markup (#31)", () => {
  it("1. matchTable emits table.matches (no-res without a result column) and a class on every cell", () => {
    expect(allMatches).toMatch(/<table class="matches" /);
    const rows = tbodyRows(allMatches);
    expect(rows).toHaveLength(hkMatches.length);
    for (const r of rows) {
      for (const c of ["c-meta", "c-date", "c-ed", "c-stage", "c-res", "c-home", "c-score", "c-away", "c-venue"]) expect(r, c).toContain(`class="${c}`);
    }
    const ev = edition(ds, "2099", "U20"); // event page: no result column, no edition column
    expect(ev).toMatch(/<table class="matches no-res" /);
    expect(tbodyRows(ev)[0]).not.toContain("c-res");
    expect(tbodyRows(ev)[0]).not.toContain("c-ed");
  });

  it("2. the phone meta line carries date, edition and stage for its match, and comes first", () => {
    const expected = hkMatches
      .map((m) => [fmtDate(m.date), `${COMP[m.competition].label} ${m.year} ${phaseLabel(m.phase)}`, isKnockout(m) ? m.round : `${m.round} · Group ${m.group}`].join(" · "))
      .sort();
    const rows = tbodyRows(allMatches);
    expect(rows.map((r) => strip(cell(r, "c-meta") ?? "")).sort()).toEqual(expected);
    for (const r of rows) expect(r.indexOf("c-meta"), "c-meta is the first cell in source order").toBeLessThan(r.indexOf("c-date"));
    expect(rows.some((r) => /Group [A-Z]/.test(cell(r, "c-meta") ?? ""))).toBe(true);
    for (const r of tbodyRows(allMatches)) expect(cell(r, "c-meta")).not.toContain("Grp");
  });

  it("2b. the source link sits outside .venue-name, so it stays on phones", () => {
    // The demo fixture has no source links; the real data does.
    const real = card(team(loadDataset("data"), "HKG"), "All matches");
    const withSrc = tbodyRows(real).filter((r) => cell(r, "c-venue")?.includes('aria-label="Source"'));
    expect(withSrc.length).toBeGreaterThan(0);
    for (const r of withSrc) {
      const v = cell(r, "c-venue")!;
      expect(v).toMatch(/<span class="venue-name">[^<]*<\/span>/);
      expect(/<span class="venue-name">[\s\S]*?<\/span>/.exec(v)![0]).not.toContain("<a ");
    }
  });

  it("3. explicit ARIA roles keep the table semantics once rows become grids", () => {
    expect(allMatches).toMatch(/<table [^>]*role="table"/);
    expect(allMatches).toMatch(/<thead role="rowgroup">/);
    expect(allMatches).toMatch(/<tbody role="rowgroup">/);
    expect(allMatches.match(/role="columnheader"/g)!.length).toBeGreaterThanOrEqual(8);
    for (const r of tbodyRows(allMatches)) expect(r).not.toMatch(/<td(?![^>]*role="cell")/);
    expect(allMatches).not.toMatch(/<tr(?![^>]*role="row")/);
    expect(allMatches).toMatch(/<th [^>]*role="columnheader"[^>]*><span class="sr-only">Result<\/span>/);
  });

  it("3b. the result chip has a spoken name: Win, Draw or Loss", () => {
    const chips = [...allMatches.matchAll(/<span class="form-chip[^>]*>/g)].map((m) => m[0]);
    expect(chips.length).toBe(hkMatches.length);
    for (const c of chips) expect(c).toMatch(/aria-label="(Win|Draw|Loss)"/);
  });

  it("4. CSS: below 560px the headers are visually hidden (not display:none) and rows are grids", () => {
    const { phone, rest } = phoneBlock();
    const head = rule(phone, "table.matches thead");
    expect(head).toMatch(/width:\s*1px/);
    expect(head).toMatch(/overflow:\s*hidden/);
    expect(head).toMatch(/clip/);
    expect(head).not.toMatch(/display:\s*none/);
    const tr = rule(phone, "table.matches tbody tr");
    expect(tr).toMatch(/display:\s*grid/);
    expect(tr).toContain('"res home score away"');
    expect(rule(rest, "table.matches td.c-meta")).toMatch(/display:\s*none/); // desktop
    expect(rule(phone, "table.matches td.c-meta")).toMatch(/display:\s*block/);
    expect(rule(rest, ".sr-only")).toMatch(/clip/);
  });
});

describe("team page: Summary and By edition on phones (#31)", () => {
  const summary = card(html, "Summary by competition");
  const byEd = card(html, "By edition");

  it("6. Summary: table.summary, labelled value cells, roles, and the phone rules", () => {
    expect(summary).toMatch(/<table class="summary" [^>]*role="table"/);
    expect(summary).toMatch(/<thead role="rowgroup">/);
    expect(summary).toMatch(/<tbody role="rowgroup">/);
    const labels = [...summary.matchAll(/data-label="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(labels)).toEqual(new Set(["Titles", "Finals apps", "Best finish", "Finals", "Qualifiers"]));
    expect(labels.length).toBe(5 * tbodyRows(summary).length);
    const { phone } = phoneBlock();
    const head = rule(phone, "table.summary thead");
    expect(head).toMatch(/width:\s*1px/);
    expect(head).toMatch(/clip/);
    expect(head).not.toMatch(/display:\s*none/);
    expect(rule(phone, "table.summary tbody tr")).toMatch(/display:\s*grid/);
    expect(rule(phone, "table.summary td[data-label]::before")).toContain("attr(data-label)");
  });

  it("7. By edition: the competition badge sits in the Year cell, and the Competition column hides on phones", () => {
    const rows = tbodyRows(byEd);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const [year, comp] = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
      expect(year).toMatch(/<span class="yr-comp"><span class="badge comp">U-(17|20)<\/span><\/span>/);
      expect(strip(year).replace(/^\d+ /, "")).toBe(strip(comp));
      expect(r).toMatch(/<td class="hide-sm"><span class="badge comp">/);
    }
    expect(byEd).toMatch(/<th class="hide-sm">Competition<\/th>/);
    const { phone, rest } = phoneBlock();
    expect(rule(phone, "td .yr-comp")).toMatch(/display:\s*block/);
    expect(rule(rest, ".yr-comp")).toMatch(/display:\s*none/);
  });
});
