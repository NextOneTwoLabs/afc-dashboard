// Banner wraps (#58): U-20 2004's notes contain a ~400-character URL with no break opportunity, so the
// `.banner` was as wide as the URL (about 984px) and the page scrolled sideways at 768px. A banner must be
// allowed to break inside a long unbroken string. The real-browser widths are measured in Chromium (see the PR).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/style.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("the notice banner wraps within the page (#58)", () => {
  it("breaks long unbroken strings: .banner sets overflow-wrap: anywhere", () => {
    const m = css.match(/(^|[}\s,])\.banner\s*\{([^{}]*)\}/);
    expect(m, ".banner rule").not.toBeNull();
    expect(m![2]).toMatch(/overflow-wrap:\s*anywhere/);
  });
  it("does not force the banner onto one line", () => {
    expect(css).not.toMatch(/\.banner[^{}]*\{[^{}]*white-space:\s*nowrap/);
  });
});
