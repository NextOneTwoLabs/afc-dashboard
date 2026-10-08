// Inter, the nextonetwo family font (#39): self-hosted and bundled by Vite, never loaded from
// Google Fonts or a CDN at runtime. Checked on a real build, so the files must be in the output.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "vite";

const root = resolve(__dirname, "..");
let out = "";
let css = "";
let cssDir = "";

beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "afc-font-"));
  await build({ root, logLevel: "silent", build: { outDir: out, emptyOutDir: true } });
  const assets = join(out, "assets");
  const file = readdirSync(assets).find((f) => f.endsWith(".css"))!;
  cssDir = assets;
  css = readFileSync(join(assets, file), "utf8");
}, 120_000);
afterAll(() => out && rmSync(out, { recursive: true, force: true }));

const faces = () => [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
const interFaces = () => faces().filter((f) => /font-family:\s*["']?Inter["']?\s*[;}]/.test(`${f};`));
const urls = (f: string) => [...f.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);

describe("Inter is self-hosted and bundled", () => {
  it("declares Inter in each weight the design uses (400–800)", () => {
    const weights = new Set(interFaces().map((f) => /font-weight:\s*(\d+)/.exec(f)?.[1]));
    for (const w of ["400", "500", "600", "700", "800"]) expect(weights.has(w), `weight ${w}`).toBe(true);
  });

  it("loads every Inter face from a local woff2 file that is in the build", () => {
    const faces = interFaces();
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) {
      const files = urls(f);
      expect(files.some((u) => u.endsWith(".woff2")), "has a woff2 source").toBe(true);
      for (const u of files) {
        expect(u, "local, not remote").not.toMatch(/^(https?:)?\/\//);
        expect(existsSync(resolve(cssDir, u)), `${u} in the build`).toBe(true);
      }
    }
  });

  it("loads nothing from another host in the built CSS (guard)", () => {
    expect(css).not.toMatch(/url\(\s*["']?(https?:)?\/\//);
    expect(css).not.toMatch(/@import\s+(url\()?["']?(https?:)?\/\//);
    expect(existsSync(dirname(cssDir))).toBe(true);
  });
});
