import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { JSONFilePreset } from "lowdb/node";
import { DryadDataset } from "./DryadDataset";

type Data = {
  lastPageIndexed: number | null;
  datasets: DryadDataset[];
};

const defaultData: Data = {
  datasets: [],
  lastPageIndexed: null,
};

const dbPath = "data/dryad/datasets.json";
await mkdir(dirname(dbPath), { recursive: true });
export const db = await JSONFilePreset(dbPath, defaultData);
