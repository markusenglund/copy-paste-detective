import { Command } from "@commander-js/extra-typings";
import { listDatasets } from "../dryad/listDatasets";
import { listFiles } from "../dryad/listFiles";
import { formatSize } from "../utils/formatSize";
import { JSONFilePreset } from "lowdb/node";

const defaultData = {
  datasets: [],
  lastPageIndexed: null,
};

const program = new Command();

program
  .name("dryad-download")
  .description("Fetch metadata about excel files from datadryad.org")
  .version("0.1.0")
  .action(async () => {
    const db = await JSONFilePreset("data/dryad.json", defaultData);
    const data = await listDatasets({ page: 1, perPage: 2 });
    const datasets = data._embedded["stash:datasets"];
    console.log(`Fetched ${datasets.length} datasets`);
    // console.log("Datasets:", JSON.stringify(datasets, null, 2));
    db.data.datasets.push(...datasets);
    await db.write();
    process.exit(0);

    for (const dataset of datasets) {
      const versionUrlPath = dataset._links["stash:version"].href;
      const version = Number(versionUrlPath.split("/").at(-1));
      const filesResponse = await listFiles({ version });
      const files = filesResponse._embedded["stash:files"];

      const excelFiles = files.filter(
        (file) => file.path.endsWith(".xlsx") || file.path.endsWith(".xls"),
      );
      console.log(`Dataset ${dataset.id} has ${excelFiles.length} Excel files`);
      console.log(excelFiles.map((file) => file.path).join(", "));
      console.log(excelFiles.map((file) => formatSize(file.size)));
      console.log({ db });

      // .filter((file) => {
      //   if (file.size < 100_000_000) {
      //     return true;
      //   }
      //   console.warn(
      //     `File ${file.path} (${formatSize(file.size)}) from dataset ${dataset.id} skipped due to exceeding size limit`,
      //   );
      //   return false;
      // });

      // for (const excelFile of excelFiles) {
      //   const fileId = Number(
      //     excelFile._links["stash:download"].href.split("/").at(-2),
      //   );
      //   await downloadFile({
      //     fileId,
      //     filename: excelFile.path,
      //     datasetId: dataset.id,
      //   });
      // }
    }
  });

program.parse();
