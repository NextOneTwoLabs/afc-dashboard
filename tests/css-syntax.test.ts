// style.css must parse cleanly (#52 review): a stray `}` after a media block made esbuild warn
// `Unexpected "}"` and the browser drop the next rule, `.yr-comp { display: none; }`, so every team
// page showed a second U-17/U-20 badge per year in "By edition" at desktop and tablet widths.
import { readFileSync } from "node:fs";
import { transformWithEsbuild } from "vite";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/style.css", "utf8");
const css = source.replace(/\/\*[\s\S]*?\*\//g, "");

describe("src/style.css parses cleanly", () => {
  it("has no CSS warnings or errors from esbuild (what vite build uses)", async () => {
    const r = await transformWithEsbuild(source, "style.css", { loader: "css", minify: true });
    expect(r.warnings.map((w) => `${w.location?.line}: ${w.text}`)).toEqual([]);
  });
  it("has balanced braces: depth never goes below zero and ends at zero", () => {
    let depth = 0;
    let line = 1;
    for (const ch of css) {
      if (ch === "\n") line++;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        expect(depth, `stray "}" near line ${line} (comments stripped)`).toBeGreaterThanOrEqual(0);
      }
    }
    expect(depth, "unclosed block").toBe(0);
  });
  it("hides .yr-comp above the phone breakpoint: a top-level `.yr-comp { display: none }` rule", () => {
    const at = css.search(/(^|[}\n])\s*\.yr-comp\s*\{\s*display:\s*none;?\s*\}/);
    expect(at, "a .yr-comp { display: none } rule").toBeGreaterThanOrEqual(0);
    let depth = 0;
    for (const ch of css.slice(0, at + 1)) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    // Ends with the preceding "}" (if any) consumed: the rule must sit at depth 0, not inside a block,
    // and must not follow a stray "}" (which would make `} .yr-comp` an invalid selector).
    expect(depth, ".yr-comp rule must be top level, after balanced blocks").toBe(0);
  });
});
