import { Command } from "@commander-js/extra-typings";
const program = new Command();

program.name("detect").description("First command").version("0.1.0");

program
  .command("excel")
  .description("Investigate an excel file")
  .action(async () => {
    console.log("Excel file detected");
  });

program.parse();
