// Site name, title, description and footer (#30, owner-approved mockup). Sources are AFC
// match reports and Wikipedia only, so the footer no longer mentions RSSSF.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(__dirname, "..", "index.html"), "utf8");

describe("index.html", () => {
  it("is named AFC Women's Youth Asian Cups", () => {
    expect(html).toContain("<title>AFC Women's Youth Asian Cups — history</title>");
    expect(html).toMatch(/class="brand"[^>]*>AFC Women's Youth Asian Cups<small>Research reference · U-17 and U-20 · qualifiers included<\/small>/);
    expect(html).toContain(
      `content="Results, tables and records from every AFC U-17 and U-20 Women's Asian Cup (and their U-16 and U-19 eras), qualifiers included."`,
    );
  });

  it("credits only the sources used", () => {
    expect(html).toContain("Compiled from AFC match reports and Wikipedia; each match links to its source.");
    expect(html).not.toMatch(/RSSSF/i);
  });
});
