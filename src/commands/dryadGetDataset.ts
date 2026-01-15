import { Command } from "@commander-js/extra-typings";
import { getDataset } from "../dryad/getDataset";
import { parseIntArgument } from "../utils/command";

const program = new Command();

program
  .name("dryad-get-dataset")
  .description("Get a specific dataset from Dryad by its extID")
  .argument("<extId>", "The Dryad dataset ID (extId)", parseIntArgument)
  .action(async (extId) => {
    const dataset = await getDataset(extId);

    // Check if it's a forbidden dataset
    if ("message" in dataset) {
      console.log(`Dataset ${extId}: ${dataset.message}`);
      return;
    }

    // Log formatted JSON for readability
    console.log(JSON.stringify(dataset, null, 2));

    // Log summary line
    console.log(`\nDataset ${dataset.id}: "${dataset.title}"`);
  });

program.parse();
