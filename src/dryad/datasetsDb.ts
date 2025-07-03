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

export const db = await JSONFilePreset("data/dryad/datasets.json", defaultData);
