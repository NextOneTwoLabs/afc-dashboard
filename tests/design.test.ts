// The nextonetwo family design (#39): the look of college.nextonetwo.com and ecnl.nextonetwo.com.
// Spec values below were read from both sites' CSS on 2026-10-07 (identical on both; college's
// file is headed "THEME TOKENS (shared with ecnl.nextonetwo.com)"), plan on #39.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { activeTeams } from "../src/stats";
import { edition } from "../src/views/edition";
import { events } from "../src/views/events";
import { team } from "../src/views/team";
import { loadDataset } from "./load";

const root = (f: string) => resolve(__dirname, "..", f);
const css = readFileSync(root("src/style.css"), "utf8");
const html = readFileSync(root("index.html"), "utf8");

/** The declarations of the first rule whose selector list is exactly `selector`. */
const rule = (selector: string) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css)?.[1] ?? "";
};
const tokens = (block: string) => Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

describe("design tokens (nextonetwo family)", () => {
  it("defines the shared base tokens", () => {
    expect(tokens(rule(":root"))).toMatchObject({
      "--font": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      "--header-height": "calc(60px + env(safe-area-inset-top, 0px))", // college's value (Kongming)
      "--radius-sm": "6px",
      "--radius-md": "10px",
      "--radius-lg": "14px",
    });
  });

  it("defines the light theme", () => {
    expect(tokens(rule('[data-theme="light"]'))).toMatchObject({
      "--bg-body": "#f5f6f8",
      "--bg-surface": "#ffffff",
      "--bg-surface-alt": "#f8f9fb",
      "--bg-header": "#ffffff",
      "--text-primary": "#111827",
      "--text-secondary": "#5b6472",
      "--border": "#e3e6ea",
      "--border-light": "#eef0f3",
      "--accent": "#1d4ed8",
      "--accent-text": "#1d4ed8",
      "--accent-contrast": "#ffffff",
      "--accent-surface": "#eef4ff",
      "--danger-text": "#b91c1c",
      "--gold": "#d97706",
      "--gold-glow": "rgba(217, 119, 6, 0.14)",
      "--row-hover": "#f3f5f8",
    });
  });

  it("defines the dark theme", () => {
    expect(tokens(rule('[data-theme="dark"]'))).toMatchObject({
      "--bg-body": "#0f1115",
      "--bg-surface": "#171a21",
      "--bg-surface-alt": "#1d2129",
      "--bg-header": "#171a21",
      "--text-primary": "#e8eaee",
      "--text-secondary": "#9aa3b2",
      "--border": "#2a2f3a",
      "--border-light": "#232833",
      "--accent": "#60a5fa",
      "--accent-text": "#7cb3fb",
      "--accent-contrast": "#0b1220",
      "--accent-surface": "rgba(96, 165, 250, 0.12)",
      "--danger-text": "#f87171",
      "--gold": "#fbbf24",
      "--gold-glow": "rgba(251, 191, 36, 0.14)",
      "--row-hover": "#1f242e",
    });
  });

  it("follows the system setting when no theme is chosen", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{[^}]*--bg-body: #0f1115;/);
  });

  it("highlights Hong Kong in the family's gold (followed team), not red", () => {
    expect(rule("tr.hk td")).toMatch(/var\(--gold-glow\)/);
    expect(rule("tr.hk td:first-child")).toMatch(/var\(--gold\)/);
  });

  it("colours results as the family's form chips: W accent, D slate, L danger", () => {
    expect(rule(".form-chip.w")).toMatch(/background: var\(--accent-text\)/);
    expect(rule(".form-chip.d")).toMatch(/background: #64748b/);
    expect(rule(".form-chip.l")).toMatch(/background: var\(--danger-text\)/);
    expect(rule('[data-theme="dark"] .form-chip.l')).toMatch(/color: #1a0505/);
  });
});

describe("header and footer (index.html)", () => {
  it("has the family header: wordmark | section label, main nav, theme toggle", () => {
    expect(html).toMatch(
      /<div class="header">\s*<div class="header-left">\s*<a class="wordmark" href="https:\/\/www\.nextonetwo\.com\/"[^>]*>\s*<img src="[^"]+"[^>]*>\s*<span class="wm-text">next<span class="accent">one<\/span>two<\/span>\s*<\/a>\s*<div class="header-divider"><\/div>\s*<a class="section-label" href="#\/">AFC Women's Youth Asian Cups<\/a>/,
    );
    expect(html).toMatch(/<nav class="gnav" id="tabs" aria-label="Main"><\/nav>/);
    expect(html).toMatch(/<button class="theme-toggle" id="theme" type="button"/);
  });

  it("uses a local logo file", () => {
    const src = /<a class="wordmark"[^>]*>\s*<img src="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(src).not.toMatch(/^(https?:)?\/\//);
    expect(existsSync(root(`public/${src.replace(/^\.?\//, "")}`)), `public/${src}`).toBe(true);
  });

  it("keeps the approved footer text in the family's site notice", () => {
    expect(html).toMatch(/<footer class="site-notice">/);
    expect(html).toContain("Compiled from AFC match reports and Wikipedia; each match links to its source.");
  });
});

describe("page markup (nextonetwo family)", () => {
  const ds = loadDataset("tests/fixtures", "tests/fixtures-u20");
  const pages: [string, string][] = [
    ["All events U-17", events(ds, "U17")],
    ["All events U-20", events(ds, "U20")],
    ["event U-17 2099", edition(ds, "2099", "U17")],
    ["event U-20 2099", edition(ds, "2099", "U20")],
    ["team HKG", team(ds, "HKG", "JPN")],
  ];

  it.each(pages)("%s opens with a page head and breadcrumb", (_name, page) => {
    expect(page.trimStart()).toMatch(/^<div class="page-head"><nav class="breadcrumb" aria-label="Breadcrumb">[\s\S]*?<\/nav><h1>/);
  });

  it.each(pages)("%s marks exactly one option in each switch as current", (_name, page) => {
    const segs = [...page.matchAll(/<div class="seg"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    expect(segs.length).toBeGreaterThan(0);
    for (const s of segs) {
      expect(s).toMatch(/^(<a class="seg-btn( active)?"[^>]*>[^<]*<\/a>)+$/);
      expect(s.match(/aria-current="page"/g)).toHaveLength(1);
      expect(s.match(/class="seg-btn active"/g)).toHaveLength(1);
    }
  });

  it("shows results as form chips", () => {
    const page = team(ds, "HKG", "JPN");
    expect(page).toMatch(/<span class="form-chip inline (w|d|l)" role="img" aria-label="(Win|Draw|Loss)" title="(Win|Draw|Loss)">[WDL]<\/span>/);
    expect(page).not.toMatch(/class="res /);
  });
});

// Amendment 2 on #39: no resource loads from another host. Ordinary <a href> links (the
// match sources, the wordmark link to www.nextonetwo.com) are navigation, not loads.
const REMOTE = /^(https?:)?\/\//i;
function remoteLoads(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /\brel="([^"]*)"/i.exec(m[0])?.[1] ?? "";
    const href = /\bhref="([^"]*)"/i.exec(m[0])?.[1] ?? "";
    if (/stylesheet|preload|icon|modulepreload|preconnect/i.test(rel) && REMOTE.test(href)) out.push(m[0]);
  }
  for (const m of text.matchAll(/<(script|img|iframe|source|video|audio)\b[^>]*\bsrc="([^"]*)"/gi)) if (REMOTE.test(m[2])) out.push(m[0]);
  for (const m of text.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/gi)) if (REMOTE.test(m[1])) out.push(m[0]);
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) if (REMOTE.test(m[1])) out.push(m[0]);
  return out;
}

describe("no resources from other hosts (guard)", () => {
  it("index.html and style.css load nothing remote", () => {
    expect(remoteLoads(html)).toEqual([]);
    expect(remoteLoads(css)).toEqual([]);
  });

  it("the guard itself flags loads but not links", () => {
    expect(remoteLoads('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">')).toHaveLength(1);
    expect(remoteLoads("@font-face { src: url(https://fonts.gstatic.com/x.woff2) }")).toHaveLength(1);
    expect(remoteLoads('<a href="https://en.wikipedia.org/wiki/X">source</a>')).toEqual([]);
  });

  const ds = loadDataset("data");
  const views: [string, string][] = [
    ["events U-17", events(ds, "U17")],
    ["events U-20", events(ds, "U20")],
    ...ds.editions.map((e): [string, string] => [`event ${e.competition} ${e.year}`, edition(ds, String(e.year), e.competition)]),
    ...activeTeams(ds).map((t): [string, string] => [`team ${t}`, team(ds, t)]),
  ];
  it.each(views)("%s loads nothing remote", (_name, page) => {
    expect(remoteLoads(page)).toEqual([]);
  });
});
