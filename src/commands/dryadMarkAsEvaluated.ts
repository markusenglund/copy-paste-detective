import { Command } from "@commander-js/extra-typings";
import { db as datasetsDb } from "../dryad/datasetsDb";

const program = new Command();

program
  .name("dryad-mark-as-evaluated")
  .description(
    "Set evaluated=true for all analyzed datasets if no extId is provided.",
  )
  .action(async () => {
    const analyzedDatasets = datasetsDb.data.datasets.filter(
      ({ status }) => status === "analyzed",
    );
    if (analyzedDatasets.length === 0) {
      console.log("No analyzed datasets found.");
      return;
    }
    console.log(`Found ${analyzedDatasets.length} analyzed datasets.`);
    for (const dataset of analyzedDatasets) {
      dataset.status = "evaluated";
    }
    await datasetsDb.write();
    console.log(
      `Done setting all ${analyzedDatasets.length} datasets to status='evaluated'.`,
    );
  });

program.parse();
