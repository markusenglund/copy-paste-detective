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

const testCases: TestCase[] = [
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
      suspicionLevelInterval: [0, 2],
    },
    confidence: "low",
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
      suspicionLevelInterval: [0, 2],
    },
    confidence: "low",
  },
  {
    extId: 78610,
    filename: "GRR1518-andblks-rawdata.xlsx",
    sheetName: "GRR1518-14",
    description:
      "The duplicate O16 value on lines 69 and 91 is a bit weird, but certainly not strong evidence of a true positive.", //TODO
    expectedResult: {
      suspicionLevelInterval: [0, 7],
    },
    confidence: "low",
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
    extId: 26305,
    filename: "Supple-Data_ChiralMF-20190428.2.xlsx",
    sheetName: "Fig.S4",
    description:
      "This is in the context of the known fraudulent data, but the specific finds in this sheet are really hard to evaluate.",
    expectedResult: {
      suspicionLevelInterval: [0, 8],
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
    extId: 14904,
    filename: "Data.xlsx",
    sheetName: "2. Response to mimic alarms",
    description:
      "False positive created from common values that have been transformed with Log10. This should be an easy one for the AI.",
    expectedResult: {
      suspicionLevelInterval: [0, 0],
    },
    confidence: "high",
  },
  {
    extId: 13867,
    filename: "Supporting_data_reply_ncomms.xlsx",
    sheetName: "adults breeding season",
    description:
      "In a way this is a false positive, but Gemini correctly identified that the ring ID of a particular bird should only exist once in the dataset, since the README specifically states that only the first capture is in the data.",
    expectedResult: {
      suspicionLevelInterval: [0, 10],
    },
    confidence: "high",
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
  {
    extId: 155108,
    filename: "2025-3-24-Field_survey.xlsx",
    sheetName: "Field survey-data",
    description:
      "It contains loads of rows with duplicated root values, including some with single digit modifications.",
    expectedResult: {
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [0, 0],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [10, 10],
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
      suspicionLevelInterval: [0, 0],
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
      suspicionLevelInterval: [0, 0],
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
      suspicionLevelInterval: [0, 0],
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
      suspicionLevelInterval: [0, 0],
    },
    confidence: "high",
  },
];
