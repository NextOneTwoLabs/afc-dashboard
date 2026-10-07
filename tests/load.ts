import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDataset, forCompetition, type Dataset } from "../src/model";

const path = (dir: string, f: string) => resolve(__dirname, "..", dir, f);
const read = (dir: string, f: string) => readFileSync(path(dir, f), "utf8");
/** Optional files (draws.csv) read as empty when absent, e.g. in the demo fixture. */
const readOpt = (dir: string, f: string) => (existsSync(path(dir, f)) ? read(dir, f) : "");

/**
 * Loads `dir` (U-17 files and the shared teams.csv) plus its U-20 files: `u20Dir`, or
 * `<dir>/u20/` when that folder exists. Without either, the dataset holds only U-17 rows.
 */
export function loadDataset(dir: string, u20Dir?: string): Dataset {
  const u20 = u20Dir ?? (existsSync(path(dir, "u20/editions.csv")) ? `${dir}/u20` : undefined);
  return buildDataset(
    read(dir, "teams.csv"),
    read(dir, "editions.csv"),
    read(dir, "matches.csv"),
    readOpt(dir, "draws.csv"),
    u20 ? { editions: read(u20, "editions.csv"), matches: read(u20, "matches.csv"), draws: readOpt(u20, "draws.csv") } : undefined,
  );
}

/** Only the U-17 rows of `dir`: for the source-count tests, which are about U-17 editions. */
export const loadU17 = (dir: string) => forCompetition(loadDataset(dir), "U17");
