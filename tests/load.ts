import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDataset } from "../src/model";

const path = (dir: string, f: string) => resolve(__dirname, "..", dir, f);
const read = (dir: string, f: string) => readFileSync(path(dir, f), "utf8");
/** Optional files (draws.csv) read as empty when absent, e.g. in the demo fixture. */
const readOpt = (dir: string, f: string) => (existsSync(path(dir, f)) ? read(dir, f) : "");

export const loadDataset = (dir: "data" | "tests/fixtures") =>
  buildDataset(read(dir, "teams.csv"), read(dir, "editions.csv"), read(dir, "matches.csv"), readOpt(dir, "draws.csv"));
