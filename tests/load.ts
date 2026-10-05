import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDataset } from "../src/model";

const read = (dir: string, f: string) => readFileSync(resolve(__dirname, "..", dir, f), "utf8");

export const loadDataset = (dir: "data" | "tests/fixtures") =>
  buildDataset(read(dir, "teams.csv"), read(dir, "editions.csv"), read(dir, "matches.csv"));
