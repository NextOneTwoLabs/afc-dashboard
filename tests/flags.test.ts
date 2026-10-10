// Flag images (#46): Windows draws no flag emoji, so teams show a local SVG flag instead.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { activeTeams } from "../src/stats";
import { edition } from "../src/views/edition";
import { events } from "../src/views/events";
import { team } from "../src/views/team";
import { loadDataset } from "./load";

const root = (f: string) => resolve(__dirname, "..", f);
const RI = /[\u{1F1E6}-\u{1F1FF}]/u;
const ds = loadDataset("data");
/** ISO alpha-2 from the emoji's two regional-indicator letters. */
const iso2 = (emoji: string) => [...emoji].map((c) => String.fromCharCode(c.codePointAt(0)! - 0x1f1e6 + 97)).join("");
const csvFlags = [...ds.teams.values()].map((t) => ({ code: t.code, iso: iso2(t.flag) }));

describe("flag files", () => {
  it.each(csvFlags)("$code ($iso) has a local flag file", ({ iso }) => {
    expect(iso).toMatch(/^[a-z]{2}$/);
    expect(existsSync(root(`public/flags/${iso}.svg`))).toBe(true);
  });

  it("public/flags holds exactly the flags of teams.csv", () => {
    const have = readdirSync(root("public/flags")).filter((f) => f.endsWith(".svg")).sort();
    expect(have).toEqual([...new Set(csvFlags.map((f) => `${f.iso}.svg`))].sort());
  });
});

describe("rendering", () => {
  const page = team(ds, "HKG", "JPN");

  it("a team link has a decorative <img class=flag> before the word joiner and name", () => {
    expect(page).toMatch(/<a class="team[^"]*" href="#\/team\/JPN"><img class="flag" src="[^"]*flags\/jp\.svg" alt="" aria-hidden="true" width="\d+" height="\d+">⁠Japan<\/a>/);
  });

  it("Hong Kong keeps its gold highlight class", () => {
    expect(page).toMatch(/<a class="team hk" href="#\/team\/HKG"><img class="flag" src="[^"]*flags\/hk\.svg"/);
    expect(events(ds, "U17")).toMatch(/<tr class="hk">/);
  });

  it("the page head shows the flag image for the team", () => {
    expect(page).toMatch(/<h1><img class="flag" src="[^"]*flags\/hk\.svg" alt="" aria-hidden="true" width="\d+" height="\d+">⁠?Hong Kong<\/h1>/);
  });

  it("team picker options have just the name, no emoji", () => {
    const options = [...page.matchAll(/<option\b[^>]*>([^<]*)<\/option>/g)].map((m) => m[1]);
    expect(options.length).toBeGreaterThan(5);
    for (const o of options) expect(o).not.toMatch(RI);
    expect(options).toContain("Japan");
  });

  const views: [string, string][] = [
    ["events U-17", events(ds, "U17")],
    ["events U-20", events(ds, "U20")],
    ...ds.editions.map((e): [string, string] => [`event ${e.competition} ${e.year}`, edition(ds, String(e.year), e.competition)]),
    ...activeTeams(ds).map((t): [string, string] => [`team ${t}`, team(ds, t)]),
  ];
  it.each(views)("%s has no regional-indicator emoji", (_n, html) => {
    expect(html).not.toMatch(RI);
  });
});

describe("no CDN", () => {
  it("every flag <img> src is local", () => {
    for (const m of team(ds, "HKG").matchAll(/<img class="flag"[^>]*\bsrc="([^"]*)"/g)) expect(m[1]).not.toMatch(/^(https?:)?\/\//);
  });
  it("style.css still loads nothing remote", () => {
    expect(readFileSync(root("src/style.css"), "utf8")).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
  });
});
