# Data from: Cooperative breeding in birds increases the within-year fecundity mean without increasing the variance: A potential mechanism to buffer environmental uncertainty

[Access this dataset on Dryad](https://doi.org/10.5061/dryad.k0p2ngfk3)

This dataset supports a meta-analysis on the effects of cooperative breeding on fecundity mean and variance in birds. It includes pooled and year-specific reproductive data, a phylogenetic tree file, and analysis scripts.

## Description of the data and file structure

We conducted a literature search on ISI Web of Science up to October 1, 2023, for studies on cooperative breeding in birds. Search terms included the names of 821 cooperatively breeding altricial species and related keywords. Citation Searching was also employed. Studies were included if they provided means and SD or SE for clutch size and brood size at fledging for both cooperative and non-cooperative nests, with at least four nests per phenotype. For detailed methods, see the main text. The dataset derived from **Table S1**, combined with the accompanying R code, allows for the reproduction of the meta-analysis results in this study. Additionally, **Table S2** shows that the pooled variance of brood size over years can serve as a reliable proxy for demographic stochasticity. In addition, we provided the phylogenetic tree file (**44species1000times.nex**) and the R scripts (**File S1 The R scripts used in this study.txt**) used in the analysis.

### Files and variables

#### Files:

* **Table S1** – Raw data pooled over years, including fecundity mean, variance, coefficient of variation (CV), and brood reduction level for cooperative and non-cooperative nests.
* **Table S2** – Year-specific raw data from 8 populations, including brood size mean, variance, and coefficient of variation (CV).
* **Phylogenetic tree file** – *44species1000times.nex*, used for comparative analysis.
* **R scripts** – *File S1 The R scripts used in this study.txt*, containing all analysis code.

#### Variables

* **Table S1**

  **Order** – Taxonomic order of the species

  **Family** – Taxonomic family of the species

  **Scientific name of species** – Currently accepted binomial name of each species, consistent with the species names used in the phylogenetic tree.

  **Common name of species** – English name of the species, provided to assist with broader and more accurate literature searches.

  **Population ID** – A unique identifier for each study population, used to distinguish between different populations in the dataset.

  **Study ID** – A unique identifier for each source publication included in the meta-analysis.

  **longitude(E)** – Longitude in decimal degrees (WGS84); positive values indicate east.

  **latitude(N)** – Latitude in decimal degrees (WGS84); positive values indicate north.

  **Mean brood size within cooperative nests** – Average number of offspring per nest in cooperative breeding groups(unit: offspring/nest).

  **SD of brood size within cooperative nests** – Standard deviation of brood size in cooperative nests.

  **Sample size of cooperative nests** – Number of cooperative nests included in the calculation.

  **Mean brood size within non-cooperative nests** – Average number of offspring per nest in non-cooperative (pair-only) breeding groups(unit: offspring/nest).

  **SD of brood size within non-cooperative nests** – Standard deviation of brood size in non-cooperative nests.

  **Sample size of non-cooperative nests** – Number of non-cooperative nests included in the calculation.

  **Mean clutch size within cooperative nests** – Average number of eggs per nest in cooperative breeding groups(unit: eggs/nest).

  **SD of clutch size within cooperative nests** – Standard deviation of clutch size in cooperative nests.

  **Sample size for cooperative clutch** – Number of cooperative nests included in the clutch size calculation.

  **Mean clutch size within non-cooperative nests** – Average number of eggs per nest in non-cooperative (pair-only) breeding groups(unit: eggs/nest).

  **SD of clutch size within non-cooperative nests** – Standard deviation of clutch size in non-cooperative nests.

  **Sample size for non-cooperative clutch** – Number of non-cooperative nests included in the clutch size calculation.

  **Brood reduction level within cooperative nests** – Proportion of offspring loss within cooperative nests, with values representing the percentage of brood reduction (unit: %; e.g.,  10 means 10%).

  **Brood reduction level within non-cooperative nests** – Proportion of offspring loss within non-cooperative nests, with values representing the percentage of brood reduction (unit: %; e.g., 10 means 10%).

  **Complete nest failure** – 1 indicates that the brood size data includes nests that failed completely, while 0 indicates that the data excludes such nests.

  **Dataset1 (n = 58)** – "1" indicates that the data for brood size with failed nests included is used from this dataset, consisting of 58 populations from 44 species.

  **Dataset2 (n = 27)** – "1" indicates that the data for brood size with failed nests excluded is used from this dataset, consisting of 27 populations from 23 species.

  **Dataset3 (n = 17)** – "1" indicates that the data for clutch size is used from this dataset, consisting of 17 populations from 16 species.

  **References** – Lists the authors and publication years of the referenced studies.

  **Sources** – Indicates the publication where the related data can be found.

  **Reference from** – Indicates the source from which the reference was obtained.

  **Data years** – Indicates the number of years of data used to construct the brood size data(unit: years).
* **Table S2**

          **Species** – Scientific name of the species, consistent with Table S1.

          **Latitude** – Latitude in decimal degrees (WGS84); positive values indicate north.

          **Longitude** – Longitude in decimal degrees (WGS84); positive values indicate east.

          **Research years** – The specific years during which the data were collected.

          **BSCooMean** – Mean brood size within cooperative nests in a single year(unit: offspring/nest).

          **BSCooSD** – Standard deviation of brood size within cooperative nests in a single year.

          **CooCombinedSD** – Standard deviation of cooperative breeding brood size pooled across years.

          **BSCoon** – Sample size of cooperative nests.

          **BSNonCooMean** – Mean brood size within non-cooperative nests in a single year(unit: offspring/nest).

          **BSNonCooSD** – Standard deviation of non-cooperative breeding brood size within a single year.

          **NonCooCombinedSD** – Standard deviation of non-cooperative breeding brood size pooled across years.

          **BSNonCoon** – Sample size of non-cooperative nests.

          **Data_Validity** – Indicates whether the study was used to evaluate the difference between pooled and annual values (1 = included; only studies with sample size > 5 were included).

          **References** – Reference information, consistent with citations listed in Table S1.

## Sharing/Access information

**Links to other publicly accessible locations of the data:**

* [https://doi.org/10.1093/beheco/araf031](https://doi.org/10.1093/beheco/araf031)

## Code/software

**Scripts and Code:**

File S1. The R scripts used in this study.

This script provides the code for the meta-analysis used in this study, as well as the code for phylogenetic paired t-tests and the calculation of interannual precipitation variability.

**Software and Versions:**

R: Version 4.1.2

R Packages:

meta (version 7.0.0)

dmetar (version 0.1.0)

metafor (version 4.4.0)

ape (version 5.7.1)

MCMCglmm (version 2.35)

phytools (version 2.0.3)

ggpubr (version 0.6.0)

ggplot2 (version 3.5.0)

progress (version 1.2.3)

ncdf4 (version 1.22)

abind (version 1.4.5)

raster (version 3.6.26)