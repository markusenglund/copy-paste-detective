# Dryad dataset

Dataset DOI: [10.5061/dryad.8931zcs37](10.5061/dryad.8931zcs37)

## Description of the data and file structure

Articles used in the review and meta-analysis.

### Files and variables

This file provides the list of reviewed articles, the articles used in the meta-analysis, as well as the information gathered from them.

#### SupplementaryMaterial.xlsx

Table S1 - Reviewed Articles: This spreadsheet compiles studies across continents on how carnivores respond to climate change, covering families such as Herpestids, Canids, Felids, and Mustelids. Research topics include morphometry, population dynamics, spatial ecology, and behavior. Most studies are from Europe, particularly on Mustelids, with several reporting positive or adaptive responses. In contrast, African and Asian species, like meerkats and mongooses, often show negative impacts. Both tested and inferred methods are used, reflecting a range of species-specific and regional responses to environmental change.

Table S2 - Meta-analysis Data: This study evaluates the projected impacts of climate change on Asian carnivores with varying habitat preferences. Under both low and high emissions scenarios, significant range contractions are expected by 2050 and 2070, with greater losses under high emissions and in the longer term. Species with narrow habitat requirements are predicted to face more severe declines compared to those with broader ecological flexibility. The consistent patterns across models and scenarios underscore the heightened vulnerability of habitat specialists to climate-driven habitat shifts in Asia.

##### Variables

* Year of the prediction
* Habitat Requirements
* Continent
* Carnivore Family
* Climate Change Scenario

## Code/software

The R code demonstrates how the meta-analysis was performed, both collectively for all the data and independently for each carnivore family.

#### File: meta\_analysis.R

R code to perform the meta analysis using the variables from SupplementaryMaterial.xlsx

#### File: meta\_analysis\_families.R

R code to perform the meta analysis for each mesocarnivore family independently, using the variables from SupplementaryMaterial.xlsx
