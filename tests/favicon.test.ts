// Favicon (#44): the tab icon is the nextonetwo "N" logo from public/, not an inline emoji.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
const attr = (tag: string, name: string) => new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(tag)?.[1];
const localFile = (href: string) => join(root, "public", href.split(/[?#]/)[0]);

describe("favicon", () => {
  it("has an SVG icon link to a local file that exists in public/", () => {
    const svg = links.find((l) => attr(l, "rel") === "icon" && attr(l, "type") === "image/svg+xml");
    expect(svg, "svg icon link").toBeDefined();
    const href = attr(svg!, "href")!;
    expect(href).toMatch(/^\/[^/]/);
    expect(existsSync(localFile(href)), href).toBe(true);
  });

  it("has an apple-touch-icon link to a local file that exists in public/", () => {
    const tag = links.find((l) => attr(l, "rel") === "apple-touch-icon");
    expect(tag, "apple-touch-icon link").toBeDefined();
    expect(existsSync(localFile(attr(tag!, "href")!))).toBe(true);
  });

  it("uses no inline data: URI (emoji) icon", () => {
    const icons = links.filter((l) => /\bicon\b/i.test(attr(l, "rel") ?? ""));
    expect(icons.length).toBeGreaterThan(0);
    for (const l of icons) expect(attr(l, "href")).not.toMatch(/^data:/i);
    expect(html).not.toContain("⚽");
  });
});
