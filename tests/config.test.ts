// Deploy-config checks. Workers Builds runs `npx wrangler preview` on non-main branches,
// which refuses to run unless wrangler.toml has a `[previews]` block (issue #6).
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";

describe("wrangler.toml", () => {
  it("has a [previews] block so preview builds can run", () => {
    const config = unstable_readConfig({ config: resolve(__dirname, "..", "wrangler.toml") });
    expect(config.previews, "wrangler.toml needs a [previews] block").toBeDefined();
  });
});
