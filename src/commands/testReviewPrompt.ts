import { Command } from "@commander-js/extra-typings";
import pMap from "p-map";
import { getDryadDatasetByExtId } from "../repositories/datasets/unifiedDatasetsRepository";
import { loadExcelFileFromDryadIndex } from "../utils/loadExcelFileFromDryadIndex";
import { StrategyName } from "../types/strategies";
import { analyzeExcelFile } from "../detection/analyzeExcelFile";
import {
  reviewSheetResults,
  SheetReviewInput,
} from "../resultsReview/resultsReview";
import { SuspicionLevel } from "../types";
import { logger } from "../utils/logger";
import { closeDb } from "../db";

interface TestCase {
  extId: number;
  filename: string;
  sheetName: string;
  description: string;
  confidence: "high" | "medium" | "low";
  expectedResult: {
    suspicionLevelInterval: [number, number];
  };
}

type TestResult = {
  testCase: TestCase;
  aiSuspicionLevel: number | null;
  expectedInterval: [number, number];
  distanceFromInterval: number | null;
  noFindingsToReview: boolean;
  error?: string;
  reviewResponse?: string;
  isUncertain: boolean;
};

const validatedTestCases: TestCase[] = [
  {
    extId: 158289,
    filename: "S._aureus_Proteome_Data_Table_FINAL..xlsx",
    sheetName: "DEA_Secreted",
    description:
      "Almost certainly a false positive. There are two rows with two identical values each, one of which is just a log2 transformation of the other. The other value seems to be the result of some type of normalization.",
    expectedResult: {
      suspicionLevelInterval: [0, 3],
    },
    confidence: "high",
  },
  {
    extId: 156871,
    filename: "AGE_Whippo_et_al_2025_Data.xlsx",
    sheetName: "Grain",
    description:
      "The offending columns (dry_basis_starch_percent) are a fraction columns, which is why they have suspiciously many significant digits.",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },
  {
    extId: 155098,
    filename: "Data.xlsx",
    sheetName: "taxon-spe. WAD, EAF, RGR & NBi",
    description:
      "Leaning false positive. The column sequences are obviously false positives, while the 696 and 1196 rows probably also are but I don't understand why the NBi column is not duplicated as would be expected if it's calculated from the t0 and t5 data.",
    expectedResult: {
      suspicionLevelInterval: [0, 5],
    },
    confidence: "medium",
  },
  {
    extId: 147943,
    filename: "LeastSquaresMeans_reduced_dataset.xlsx",
    sheetName: "LeastSquaresMeans_reduced_datas",
    description:
      "I believe this is a false positive. The values are created through a statistical transformation from integer data. Many of the duplicated values have high occurrences. The simultaneous duplication of 'siliques/plant' and 'total siliques/pot' is expected, as the pot total is simply the plant count multiplied by 4 (the group size).",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "medium",
  },
  {
    extId: 146016,
    filename: "NDS_data_Huttunen_et_al_rev2.xlsx",
    sheetName: "Chl-a values",
    description:
      "The columns were transformed from a low-uniqueness number. chl_a_total and chl_a_per_day are both calculated using formulas that are almost the same.",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "medium",
  },
  {
    extId: 145981,
    filename: "Data_Excel.xlsx",
    sheetName: "Sheet1",
    description:
      "It's a false positive. The model got confused by the S_peakV repetitions which couldn't possibly be suspicious. The 'Greater Unimodal' (GU) variable is calculated as the maximum of the S and T responses",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },
  {
    extId: 142279,
    filename: "turtle_location_data_forSSM.xlsx",
    sheetName: "turtle_location_data_forSSM",
    description:
      "Two turtles have almost the exact same locations at the same time, probably because they were swimming together or were transported on the same boat.",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },
  {
    extId: 72706,
    filename: "TTYH_absence_of_chloride_conduction.xlsx",
    sheetName: "Fig. 4,c,d,e",
    description:
      "It's a false positive stemming from values with high occurrences. The values in the sheet, despite having many decimal places, appear to be drawn from a very limited set of discrete numbers.",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },
  {
    extId: 14904,
    filename: "Data.xlsx",
    sheetName: "2. Response to mimic alarms",
    description:
      "False positive created from common values that have been transformed with Log10. This should be an easy one for the AI.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 5416,
    filename: "Schmid_2014-06-07391C_Trait_Divergence.xlsx",
    sheetName: "Trait Means and Difference",
    description:
      "The duplicate columns are not individual data. The vertical sequences are the same list of species pairs being repeated for two different treatment groups",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },

  {
    extId: 3043,
    filename: "science data for repository.xlsx",
    sheetName: "Pitch data",
    description:
      "False positive caused by angles being artificially high precision numbers due to arctan transformation.",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },
  {
    extId: 155108,
    filename: "2025-3-24-Field_survey.xlsx",
    sheetName: "Field survey-data",
    description:
      "It contains loads of rows with duplicated root values, including some with single digit modifications.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 155108,
    filename: "2025-3-24-common_garden.xlsx",
    sheetName: "common garden-data",
    description:
      "The less suspicious of the two sheets, containing slightly fewer rows with duplicated root values.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
  {
    extId: 155414,
    filename:
      "Data_Dryad_Drought_Decreases_Carbon_Flux_but_Not_Transport_Speed_of_Newly_Fixed_Carbon_from_Leaves_to_Sinks_in_a_Giant_Bamboo_Forest-new.xlsx",
    sheetName: "Leaves to Soil",
    description: "Contains just insane data with so many red flags.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 111029,
    filename: "data.xlsx",
    sheetName: "Data",
    description: "Duplicated soil measurements for different plots.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
  {
    extId: 146898,
    filename: "data.xlsx",
    sheetName: "chill coma recovery duration(s)",
    description:
      "15C female data has duplicated columnar sequences that make no sense at all.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 142655,
    filename: "CoCo_ms_Dataset_Revised_Dryad_Submission.xlsx",
    sheetName: "Neural",
    description:
      "The EEG data has duplications between samples belonging to different children!",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 139667,
    filename:
      "Data_Fig._5b_Persistence_length_as_a_funciton_of_bacterial_concentration.xlsx",
    sheetName: "P. megatetrium Experiment1",
    description:
      "Data from different videos of different runs of the experiment have the exact same data but in different scrambled order. This turned out to be because of a combination of software malfunction and spreadsheet user error.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 92897,
    filename: "Source_Data.xlsx",
    sheetName: "Mastersheet",
    description:
      "Total Phosphorus ('TP') and Total Organic Phosphorus ('TOP') values are identical to 15 significant digits between different samples (different Blocks).",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 146873,
    filename: "Datasets_figure_contents.xls",
    sheetName: "Cell cycle scores_Fig 2b",
    description:
      "A sequence of 33 rows starting from row 251 is a perfect duplicate the block starting from row 284. There's no good reason for this.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 16328,
    filename:
      "Bierbach et al clonal molly behav development_data for deposit.xlsx",
    sheetName: "Clonal molly behavioral individ",
    description:
      "The data for fish size have been scrambled so that the same fish have different sizes in different rows. The impact is huge since they got a false negative result for movement behaviori being caused by size differences.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 158552,
    filename: "Field_Study_Data.xlsx",
    sheetName: "Feeding visits",
    description:
      "A false positive due chick metadata being duplicated between feedings and parents feeding them in the same order.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 118013,
    filename: "India_Delhi2018dataset_figures.xlsx",
    sheetName: "Fig_2(right)",
    description:
      "One case of a duplicate row between Chloride and EC which is a real but small issue.",
    expectedResult: {
      suspicionLevelInterval: [6, 10],
    },
    confidence: "high",
  },
  {
    extId: 90062,
    filename: "NKA_Enzyme_Assays_Raw_Data.xlsx",
    sheetName: "IC50",
    description:
      "Clear cut fraud case - the data has duplications between Ostrich and snake data with some values changed by one digit manually.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 54401,
    filename: "ProjectionEP_ManuscriptData_SUBMIT.xlsx",
    sheetName: "Fig3d",
    description:
      "Fig3d has multiple sheets within a sheet so the rows don't match up which confuses the AI. However, the duplications in these columns are still very suspicious.",
    expectedResult: {
      suspicionLevelInterval: [6, 10],
    },
    confidence: "high",
  },
  {
    extId: 8685,
    filename: "MouseTreatmentMotorFunction.xlsx",
    sheetName: "Sheet1",
    description:
      "The ExGF and regular control mice have the exact same data which is very suspicious.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 61761,
    filename: "PCT_for_convict_cichlid.xlsx",
    sheetName: "Behaviors of subject",
    description: "The data is suspicious but is not used in the analysis.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
  {
    extId: 65904,
    filename: "Allen_et_al_NatComms_data.xlsx",
    sheetName: "plant_level",
    description:
      "The duplicated columns are group level data for the specific species.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 23350,
    filename: "Riehl and Strong_Social Parasitism Data_2007-2017_DRYAD.xlsx",
    sheetName: "Pairwise Distances",
    description:
      "In ornithological studies, Roman numerals (I, II) appended to a nest or group ID typically denote sequential nesting attempts within the same breeding season",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 41708,
    filename: "Data4_R2_FDI.xlsx",
    sheetName: "Sheet1",
    description:
      "It's a constantly repeating column sequence that is not suspicious.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 121018,
    filename: "propylene_epoxidation_data.xlsx",
    sheetName: "Fig. 2E - XPS Pd",
    description:
      "The background signal is smooth and changes very slowly. The values 1055.25, 1055.25, 1055.24 represent a slow monotonic decrease.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 4826,
    filename: "Leaflitter_physicochemical_properties_submitted.xlsx",
    sheetName: "Sheet3",
    description:
      "It's almost certainly a genuine copy-paste mistake. 3 values in a row for both carbon and nitrogen is unlikely to happen naturally. It doesn't really impact the primary conclusions about community dynamics between different species so I think it should be medium impact.",
    expectedResult: {
      suspicionLevelInterval: [7, 10],
    },
    confidence: "high",
  },
  {
    extId: 2313,
    filename: "Biomass data for archiving.xlsx",
    sheetName: "Sheet1",
    description:
      "Likely false positive stemming from how biomass is calculated. The AI was just given the two values in a row, but there are in fact a lot of shared values in the spreadsheet. The data might have been based on a measurement like 'Average grass height', which was then extrapolated to get the total biomass.",
    expectedResult: {
      suspicionLevelInterval: [0, 2],
    },
    confidence: "high",
  },
  {
    extId: 9683,
    filename: "Dataset_06_08_2017.xlsx",
    sheetName: "Microcosm soil B",
    description:
      "The microcosm soil data for this paper has many instances where replicates of the same taxa combination have perfectly identical values for some columns but not others. In other cases the bacterial composition columns as well as enzyme activity columns are duplicated, but the respiration columns are not. Very weird, potentially serious.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 4209,
    filename: "Morphological parameters of juvenile daphnia magna.xlsx",
    sheetName: "K34J",
    description:
      "A single block of 5 perfectly duplicated rows in a sequence is definitely a true positive but it's one out of many sheets with 800 rows.",
    expectedResult: {
      suspicionLevelInterval: [7, 10],
    },
    confidence: "high",
  },
  {
    extId: 13830,
    filename: "interaction_data_final.xlsx",
    sheetName: "Sheet1",
    description:
      "The 'direct pathogen inhibition' column has values that are the result of dividing by 30136 or a multiple thereof. That's what explains the large numbers of decimal points. There's also an unusual amount of clustering, but it's not particularly surprising to see a couple of duplicates. With that being said, there are some numbers at the start that are not anywhere close to being a 30136 fraction. That's very weird.",
    expectedResult: {
      suspicionLevelInterval: [0, 3],
    },
    confidence: "high",
  },
  {
    extId: 77770,
    filename: "Data_Fig5supp1.xlsx",
    sheetName: "Sheet1",
    description: "Two spreadsheets stacked on top of each other.",
    expectedResult: {
      suspicionLevelInterval: [0, 0],
    },
    confidence: "high",
  },
  {
    extId: 58897,
    filename: "Saha_et_al_2020_ERL_Data.xlsx",
    sheetName: "Data",
    description:
      "The set has a ton of low-cardinality numbers including the WFPS25cm column that Gemini focuses on. Not sure why the numbers have such low uniqueness but it points to something structural about the data rather than copy-and-paste. It's a set used to test a the output of a model, I'm highly skeptical that those sorts of studies are likely to contain fraudulent data, though they might have mistakes.",
    expectedResult: {
      suspicionLevelInterval: [0, 4],
    },
    confidence: "medium",
  },
  {
    extId: 4358,
    filename: "Allen et al17EL_Amphibian_reptile_invasion_&_life_history.xlsx",
    sheetName: "invasive reptiles & LH DATA",
    description:
      "The dataset has a ton of Hatchling mass values that are shared between different species of the same family. The most likely theory is that they were imputed from other similar species to get data where they didn't have it for a particular species. Not a mistake and not fraud.",
    expectedResult: {
      suspicionLevelInterval: [0, 3],
    },
    confidence: "high",
  },
  {
    extId: 68405,
    filename: "Saprotrophicfungi_ASE_2020.xlsx",
    sheetName: "Exp. WA",
    description:
      "The raw data of the WA experiment, contains pH measurements that seem to have been duplicated between different treatment groups. The pH values for observations at week 8 are the exact same for the four pots treated with sawdust from beech, hazel, willow and poplar as well as paper pulp.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
  {
    extId: 46465,
    filename: "Yasuhara_pnas_data.xlsx",
    sheetName: "SST_&_Diversity",
    description:
      "It seems like the duplicates are just in the weather data (which is probably based on coords), not the biodiversity data so I think we're just looking at separate measurements taken in the same locations ordered in the same way for some reason, that got slightly different results.",
    expectedResult: {
      suspicionLevelInterval: [0, 3],
    },
    confidence: "high",
  },
  {
    extId: 6408,
    filename: "Real-Time PCR final.xlsx",
    sheetName: "Sheet1",
    description: "It's a clear case of a completely fabricated control group.",
    expectedResult: {
      suspicionLevelInterval: [10, 10],
    },
    confidence: "high",
  },
  {
    extId: 97510,
    filename: "Science_Advances_(add6249)_data.xlsx",
    sheetName: "precipitation experiment",
    description:
      "The total ANPP are duplicated, but its constituent parts are not, but they do correctly add up to the total values.",
    expectedResult: {
      suspicionLevelInterval: [9, 10],
    },
    confidence: "high",
  },
  {
    extId: 72335,
    filename: "Raw_data_Mertens_et_al_2021_NaturePlants.xlsx",
    sheetName: "Performance_LnRR",
    description:
      "It's a false positive that stems from the suspicious column being a log response ratio. For example the PrPx duplicated sequence actually stem from the following five Response values in the Performance sheet: 1.0 1.8 1.7 1.8 1.6 Finding 5 such occurences in a row in a spreadsheet of thousands of rows is not suspicious at all.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 141979,
    filename: "S1_data.xlsx",
    sheetName: "Raw Data LME",
    description:
      "This looks to be a case of a few rows that were accidentally copy&pasted by the authors or incorrectly labelled by the museums.",
    expectedResult: {
      suspicionLevelInterval: [6, 10],
    },
    confidence: "high",
  },
  {
    extId: 51969,
    filename: "Vidal_et_al_richness.xlsx",
    sheetName: "strain_redundancy",
    description:
      "Gemini has incorrectly overestimated how rare it is to see duplicate sequences of binary data. Yes, we have 50 values in a row, but only 6 of the values are 0s and we could have chosen any sequence from 5000 rows.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },

  {
    extId: 133183,
    filename: "FigureData.xlsx",
    sheetName: "Dermis Thickness",
    description:
      "The dataset contains both human measured numbers and numbers created from a digital scan. The digital scan numbers likely originated as integer pixel values, which explains why they have high occurrences. All datapoints are from one single elephant trunk. The reason why two adjacent rows often share the same value is likely because they are measurements of two adjacent pieces of skin.",
    expectedResult: {
      suspicionLevelInterval: [0, 1],
    },
    confidence: "high",
  },
  {
    extId: 146829,
    filename: "Experimental_Data.xlsx",
    sheetName: "Analysis data",
    description:
      "It seems like the authors duplicated replicates without taking care to mention it or do the correct statistics.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
  {
    extId: 145338,
    filename: "Tree-DBH-BA_and_BM_Growth-Data-BySps.xlsx",
    sheetName: "Data",
    description:
      "There are multiple sequences of 5-11 rows with exactly the same data, but sometimes listed as belonging to different plots. The paper mentions that 9214 samples were taken, but the spreadsheet has 9398 rows. Best guess is that the discrepancy stems from duplicated rows. But was the faulty Excel sheet actually used for the statistical results in the paper? I have not had time to check.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
];

const casesWithIssuesUnrelatedToDuplications: TestCase[] = [
  {
    extId: 13867,
    filename: "Supporting_data_reply_ncomms.xlsx",
    sheetName: "adults breeding season",
    description:
      "In a way this is a false positive, but Gemini correctly identified that the ring ID of a particular bird should only exist once in the dataset, since the README specifically states that only the first capture is in the data.",
    expectedResult: {
      suspicionLevelInterval: [6, 10],
    },
    confidence: "high",
  },
  {
    extId: 162720,
    filename: "NP_Data.xlsx",
    sheetName: "Sheet1",
    description:
      "It's the classic PCoA case where rows with identical richness values unexpectedly produce different PCoA results, which to my understanding is indicative of a real issue. However, it has nothing to do with the flagged duplications which are false positives.",
    expectedResult: {
      suspicionLevelInterval: [8, 10],
    },
    confidence: "high",
  },
];

const uncertainTestCases: TestCase[] = [
  {
    extId: 3702,
    filename: "Supplementary_Data_2.xlsx",
    sheetName: "Shift_species_2798",
    description:
      "Gemini finds that the Italy data with repeated occurences of the exact same elevation shifts are dubious and I have to agree. Everything else is a false positive.",
    expectedResult: {
      suspicionLevelInterval: [2, 8],
    },
    confidence: "low",
  },
  {
    extId: 158535,
    filename: "Miller_procellariiform_flight_parameter_database.xlsx",
    sheetName: "Nocturnal activity (NFI)",
    description:
      "It's a meta-analysis. It's difficult to tell if a mistake has occured. On one hand, it's plausible that the source pooled data for the two closely related species, but on the other it looks wrong that they have different sample sizes but the same mean and standard deviation.",
    expectedResult: {
      suspicionLevelInterval: [2, 8],
    },
    confidence: "low",
  },
  {
    extId: 139030,
    filename: "Data_for_Figure_S2_Trait_Validation.xlsx",
    sheetName: "StemDiameter",
    description:
      "Difficult one. They have four replicates for each 'column', and a column must reasonably refer to a specific row of plants. So it makes no sense for the manual measurements to be repeated.",
    expectedResult: {
      suspicionLevelInterval: [2, 8],
    },
    confidence: "low",
  },
  {
    extId: 111831,
    filename: "Supplementary_Information.xlsx",
    sheetName: "Supplementary Data 5",
    description:
      "Most likely a false positive. It is statistically probable and technically expected that for certain ranges of concrete strength or load, two different design codes will arrive at the exact same 'minimum reinforcement' configuration or the same discrete member size. ",
    expectedResult: {
      suspicionLevelInterval: [0, 5],
    },
    confidence: "low",
  },
  {
    extId: 78610,
    filename: "GRR1518-andblks-rawdata.xlsx",
    sheetName: "GRR1518-14",
    description:
      "The duplicate O16 value on lines 69 and 91 is a bit weird, but certainly not strong evidence of a true positive.",
    expectedResult: {
      suspicionLevelInterval: [0, 8],
    },
    confidence: "low",
  },
  {
    extId: 26305,
    filename: "Supple-Data_ChiralMF-20190428.2.xlsx",
    sheetName: "Fig.S4",
    description:
      "This is in the context of the known fraudulent data, but the specific finds in this sheet are really hard to evaluate.",
    expectedResult: {
      suspicionLevelInterval: [0, 10],
    },
    confidence: "low",
  },
  {
    extId: 23027,
    filename: "final_report.xls",
    sheetName: "Fold Change",
    description: "Can't evaluate.",
    expectedResult: {
      suspicionLevelInterval: [0, 10],
    },
    confidence: "low",
  },
  {
    extId: 21495,
    filename: "CDD_Data.xlsx",
    sheetName: "Sheet1",
    description: "Can't evaluate",
    expectedResult: {
      suspicionLevelInterval: [0, 10],
    },
    confidence: "low",
  },
  {
    extId: 8258,
    filename: "Dryad_data_27-10-17.xlsx",
    sheetName: "acoustic analyses",
    description:
      "The duplications in 'Wp2p' for rows 299 and 300 might well be a true positive.",
    expectedResult: {
      suspicionLevelInterval: [0, 8],
    },
    confidence: "low",
  },
];

const allStrategies = [
  StrategyName.DuplicateRows,
  StrategyName.RepeatedColumnSequences,
];

function calculateDistanceFromInterval(
  actual: number,
  [min, max]: [number, number],
): number {
  if (actual >= min && actual <= max) return 0;
  return actual < min ? min - actual : actual - max;
}

async function processTestCase(
  testCase: TestCase,
  isUncertain: boolean,
): Promise<TestResult> {
  const { extId, filename, sheetName, expectedResult } = testCase;
  const expectedInterval = expectedResult.suspicionLevelInterval;

  try {
    // Load dataset
    const dataset = await getDryadDatasetByExtId(extId);
    if (!dataset) {
      return {
        testCase,
        aiSuspicionLevel: null,
        expectedInterval,
        distanceFromInterval: null,
        noFindingsToReview: false,
        error: `Dataset with extId ${extId} not found`,
        isUncertain,
      };
    }

    // Find Excel file index by matching filename
    const excelFiles = dataset.dataFiles.filter((f) => f.fileType === "excel");
    const fileIndex = excelFiles.findIndex((f) => f.filename === filename);
    if (fileIndex === -1) {
      return {
        testCase,
        aiSuspicionLevel: null,
        expectedInterval,
        distanceFromInterval: null,
        noFindingsToReview: false,
        error: `File "${filename}" not found in dataset ${extId}`,
        isUncertain,
      };
    }

    // Load Excel file
    const excelFileData = loadExcelFileFromDryadIndex(dataset, fileIndex);

    // Find target sheet
    const targetSheet = excelFileData.sheets.find((s) => s.name === sheetName);
    if (!targetSheet) {
      return {
        testCase,
        aiSuspicionLevel: null,
        expectedInterval,
        distanceFromInterval: null,
        noFindingsToReview: false,
        error: `Sheet "${sheetName}" not found in file "${filename}"`,
        isUncertain,
      };
    }

    // Filter excelFileData to only include the target sheet
    const filteredExcelFileData = { ...excelFileData, sheets: [targetSheet] };

    // Run analysis
    const analysis = await analyzeExcelFile(
      allStrategies,
      filteredExcelFileData,
    );

    // Check if any Medium/High suspicion findings exist
    const duplicateRows =
      analysis.results[StrategyName.DuplicateRows]?.duplicateRows ?? [];
    const sequences =
      analysis.results[StrategyName.RepeatedColumnSequences]?.sequences ?? [];

    const hasMediumHighFindings =
      duplicateRows.some((r) =>
        [SuspicionLevel.Medium, SuspicionLevel.High].includes(r.suspicionLevel),
      ) ||
      sequences.some((s) =>
        [SuspicionLevel.Medium, SuspicionLevel.High].includes(s.suspicionLevel),
      );

    if (!hasMediumHighFindings) {
      return {
        testCase,
        aiSuspicionLevel: null,
        expectedInterval,
        distanceFromInterval: null,
        noFindingsToReview: true,
        isUncertain,
      };
    }

    // Get categorized columns and duplicate values for the sheet
    const categorizedColumns = analysis.categorizedColumnsBySheet.get(
      targetSheet.name,
    );
    const duplicateValuesResult = analysis.duplicateValuesResultsBySheet.get(
      targetSheet.name,
    );

    if (!categorizedColumns || !duplicateValuesResult) {
      return {
        testCase,
        aiSuspicionLevel: null,
        expectedInterval,
        distanceFromInterval: null,
        noFindingsToReview: false,
        error: `Missing analysis data for sheet "${sheetName}"`,
        isUncertain,
      };
    }

    // Build review input
    const reviewInput: SheetReviewInput = {
      sheet: targetSheet,
      excelFileData: filteredExcelFileData,
      categorizedColumns,
      duplicateRows: duplicateRows.filter(
        (r) => r.sheet.name === targetSheet.name,
      ),
      duplicateColumnSequences: sequences.filter(
        (s) => s.sheetName === targetSheet.name,
      ),
      numOccurrencesByNumericValue:
        duplicateValuesResult.numOccurrencesByNumericValue,
    };

    // Call AI review
    const reviewResult = await reviewSheetResults(reviewInput);

    if (!reviewResult) {
      return {
        testCase,
        aiSuspicionLevel: null,
        expectedInterval,
        distanceFromInterval: null,
        noFindingsToReview: true,
        isUncertain,
      };
    }

    // Convert truePositiveProbability (0-1) to suspicion level (0-10)
    const aiSuspicionLevel = reviewResult.truePositiveProbability * 10;
    const distance = calculateDistanceFromInterval(
      aiSuspicionLevel,
      expectedInterval,
    );

    return {
      testCase,
      aiSuspicionLevel,
      expectedInterval,
      distanceFromInterval: distance,
      noFindingsToReview: false,
      reviewResponse: reviewResult.response,
      isUncertain,
    };
  } catch (error) {
    return {
      testCase,
      aiSuspicionLevel: null,
      expectedInterval,
      distanceFromInterval: null,
      noFindingsToReview: false,
      error: error instanceof Error ? error.message : String(error),
      isUncertain,
    };
  }
}

function printResults(results: TestResult[]): void {
  console.log("\n=== Individual Test Results ===\n");

  for (const result of results) {
    const {
      testCase,
      aiSuspicionLevel,
      expectedInterval,
      distanceFromInterval,
      noFindingsToReview,
      error,
    } = result;
    const [min, max] = expectedInterval;

    console.log(
      `[${testCase.extId}] ${testCase.filename} - ${testCase.sheetName}`,
    );

    if (error) {
      console.log(`  Status: ERROR | ${error}`);
    } else if (noFindingsToReview) {
      console.log(
        `  Status: NO FINDINGS | Strategies found no Medium/High suspicion findings`,
      );
    } else if (aiSuspicionLevel !== null && distanceFromInterval !== null) {
      const status = distanceFromInterval === 0 ? "PASS" : "FAIL";
      console.log(
        `  Status: ${status} | Expected: [${min}, ${max}], Actual: ${aiSuspicionLevel.toFixed(1)}`,
      );
      console.log(`  Distance: ${distanceFromInterval.toFixed(2)}`);
    }
    console.log("");
  }

  // Summary statistics
  const completedResults = results.filter(
    (r) => r.aiSuspicionLevel !== null && !r.error && !r.noFindingsToReview,
  );
  const validatedResults = completedResults.filter((r) => !r.isUncertain);
  const errorResults = results.filter((r) => r.error);
  const noFindingsResults = results.filter((r) => r.noFindingsToReview);

  console.log("=== Summary Statistics ===\n");
  console.log(`Total test cases: ${results.length}`);
  console.log(`AI reviews completed: ${completedResults.length}`);
  console.log(`No findings to review: ${noFindingsResults.length}`);
  console.log(`Errors: ${errorResults.length}`);

  // Pass/fail rate and average distance based on validated test cases only
  if (validatedResults.length > 0) {
    const withinInterval = validatedResults.filter(
      (r) => r.distanceFromInterval === 0,
    ).length;
    const totalDistance = validatedResults.reduce(
      (sum, r) => sum + (r.distanceFromInterval ?? 0),
      0,
    );
    const avgDistance = totalDistance / validatedResults.length;

    const falsePositives = validatedResults.filter(
      (r) => r.aiSuspicionLevel! > r.expectedInterval[1],
    ).length;

    const falseNegatives = validatedResults.filter(
      (r) => r.aiSuspicionLevel! < r.expectedInterval[0],
    ).length;

    // Calculate confidence score based on how extreme the AI scores are
    const confidenceDistances = completedResults.map((r) => {
      const score = r.aiSuspicionLevel!;
      // Distance to nearest extreme (0 or 10)
      return Math.min(score, 10 - score);
    });
    const avgConfidenceDistance =
      confidenceDistances.reduce((sum, d) => sum + d, 0) /
      confidenceDistances.length;
    const confidenceScore = (5 - avgConfidenceDistance) * 2;

    console.log(
      `\nScoring (based on ${validatedResults.length} validated test cases):`,
    );
    console.log(
      `  Tests within expected interval: ${withinInterval}/${validatedResults.length} (${((withinInterval / validatedResults.length) * 100).toFixed(1)}%)`,
    );
    console.log(`  False positives: ${falsePositives} (AI too suspicious)`);
    console.log(
      `  False negatives: ${falseNegatives} (AI not suspicious enough)`,
    );
    console.log(
      `  Total distance score: ${totalDistance.toFixed(2)} (lower is better)`,
    );
    console.log(`  Average distance per test: ${avgDistance.toFixed(2)}`);
    console.log(
      `  AI confidence score: ${confidenceScore.toFixed(2)}/10 (based on score extremeness)`,
    );
  }

  // Bias calculation based on all completed test cases
  if (completedResults.length > 0) {
    const actualSum = completedResults.reduce(
      (sum, r) => sum + (r.aiSuspicionLevel ?? 0),
      0,
    );
    const expectedMidpointSum = completedResults.reduce((sum, r) => {
      const [min, max] = r.expectedInterval;
      return sum + (min + max) / 2;
    }, 0);
    const biasScore = actualSum - expectedMidpointSum;
    const avgBias = biasScore / completedResults.length;
    const biasSign = biasScore >= 0 ? "+" : "";

    console.log(`\nBias (based on ${completedResults.length} test cases):`);
    console.log(`  Total bias score: ${biasSign}${biasScore.toFixed(2)}`);
    console.log(`  Average bias per test: ${biasSign}${avgBias.toFixed(2)}`);
    console.log(`    (negative = AI biased low, positive = AI biased high)`);
  }

  if (noFindingsResults.length > 0) {
    console.log("\n=== No Findings to Review ===\n");
    for (const result of noFindingsResults) {
      console.log(
        `[${result.testCase.extId}] ${result.testCase.filename} - ${result.testCase.sheetName}`,
      );
      console.log(`  Strategies found no Medium/High suspicion findings`);
    }
  }

  if (errorResults.length > 0) {
    console.log("\n=== Errors ===\n");
    for (const result of errorResults) {
      console.log(
        `[${result.testCase.extId}] ${result.testCase.filename}: ${result.error}`,
      );
    }
  }
}

const program = new Command();

program
  .name("test-review-prompt")
  .description("Test AI review prompt accuracy against validated test cases")
  .version("0.1.0")
  .option("--validated-only", "Only run validated test cases")
  .option("--uncertain-only", "Only run uncertain test cases")
  .option("--ext-id <extId>", "Run only test case(s) with this extId", parseInt)
  .action(async (options) => {
    const startTime = Date.now();

    try {
      // Select test cases based on options
      let testCasesWithFlags: Array<{
        testCase: TestCase;
        isUncertain: boolean;
      }> = [];

      if (options.validatedOnly) {
        testCasesWithFlags = validatedTestCases.map((tc) => ({
          testCase: tc,
          isUncertain: false,
        }));
      } else if (options.uncertainOnly) {
        testCasesWithFlags = uncertainTestCases.map((tc) => ({
          testCase: tc,
          isUncertain: true,
        }));
      } else {
        testCasesWithFlags = [
          ...validatedTestCases.map((tc) => ({
            testCase: tc,
            isUncertain: false,
          })),
          ...casesWithIssuesUnrelatedToDuplications.map((tc) => ({
            testCase: tc,
            isUncertain: false,
          })),
          ...uncertainTestCases.map((tc) => ({
            testCase: tc,
            isUncertain: true,
          })),
        ];
      }

      // Filter by extId if specified
      if (options.extId !== undefined) {
        testCasesWithFlags = testCasesWithFlags.filter(
          (tc) => tc.testCase.extId === options.extId,
        );
      }

      if (testCasesWithFlags.length === 0) {
        logger.error("No test cases match the specified criteria");
        process.exit(1);
      }

      logger.info(`Running ${testCasesWithFlags.length} test cases...`);

      // Process test cases in parallel with concurrency limit
      const results = await pMap(
        testCasesWithFlags,
        ({ testCase, isUncertain }) => processTestCase(testCase, isUncertain),
        { concurrency: 8 },
      );

      // Print results
      printResults(results);

      // Print execution time
      const endTime = Date.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);
      console.log(`\nExecution time: ${durationSeconds}s`);
    } finally {
      await closeDb();
    }
  });

program.parse();
