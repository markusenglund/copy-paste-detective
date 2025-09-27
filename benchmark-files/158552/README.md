# Parental control: Ecology drives plasticity in parental response to offspring signals

**Video File Overview**\
The data and code refers to videos of Parus major parents feeding chicks. The complete collection of videos can be found on Zenodo in two data depositories. The first (DOI [10.5281/zenodo.15625055](https://doi.org/10.5281/zenodo.15625055)) has videos  from nests A, AA, B, BB, C, CC, D, DD, E, EE, F, FF, G, H, I, J, K. The second (DOI [10.5281/zenodo.15625465](https://doi.org/10.5281/zenodo.15625465)) has videos from nests L, M, N, O P, Q, R, S, T, U, V, W, X, Y, and Z. These files correspond to the variable "Blinded.film.file" which is the file name of the video data where each feeding visit can be found. They proceed in order, so C_2 is followed by C-3 and then by C-4, for example.  The first video for each nest "_1" is not included to give birds time to return to normal behavior after being disturbed during cross-fostering.

**DATA & CODE FILE OVERVIEW**
This data repository consists of one data file with two sheets, and this README document, with the following data filenames and variables. Missing data due to the camera's view being obscured are coded "NA"

1. **Field_Study_Date: Feeding Visits**
   Variables
   1. unique.feeding.visit.ID: label for each row of the dataset
   2. nest: ID of the nest
   3. supplemented: whether the nest was in the supplemented (extra food) or unsupplemented (no extra food) treatment 
   4. hatch.date.since.march.1: when the first egg in the nest hatched, in days since March 1
   5. clutch size: the number of eggs laid
   6. nest.brood.size: the number of chicks that hatched in this nest
   7. film.brood.size: the number of chicks during filming, after cross-fostering (7 or 6)
   8. brood.size.change: the difference in the number of chicks in the original vs the filming brood
   9. film.date.since.march.1: the date of filming, in days since March 1
   10. number.dead.by.day.7: the number of dead chicks in the first 7 days after hatching
   11. any. prior.mortality: yes/no (1/0) on whether at least one chick had died in the first 7 days after hatching
   12. male.id: ID of the father 
   13. female.id: ID of the mother
   14. Blinded.film.file: file name of the video data where this feeding visit can be found
   15. hour.Entrance, min.Entrance, sec.Entrance: the time the parent entered the nest
   16. parent.sex: whether the male or female performed this feeding visit
   17. visit.number.for.parent: which number feeding visit this is for the parent (first visit recorded = 1, second = 2, etc)
   18. fed.chick.ring.number: ID of the chick who received food on this feeding visit
   19. fed.chick.beg.posture: begging posture (0-3, 0 is no begging, 3 is maximum) of the chick who received food on this feeding visit
   20. fed.chicks.height.rank: height rank of the chick who received food on this feeding visit (highest chick to parent = 1, second highest = 2, etc)
   21. fed.chicks.nearest.rank: proximity rank of the chick who received food on this feeding visit (closest chick to parent = 1, second closest = 2, etc)
   22. chick1.beg, chick2. beg, chick3. beg, chick4 .beg, chick5.beg, chick6. beg, chick7. beg: begging postures of all 7 chicks during that feeding visit. 
   23. missing .beg.number: number of chicks where we could not identify their begging posture
   24. relative.beg.fed.chick.no.zero: how much a chick was begging, relative to the other begging chicks on that visit (1= same as nest mates, >1 = more than nest mates)
   25. mean.beg.brood.no.zero: the mean begging posture for the whole brood on that feeding visit, excluding chicks that were not begging
   26. mean.beg.brood.with.zero: the mean begging posture for the whole brood on that feeding visit
   27. max.beg.brood: the highest begging posture seen on this visit
       28: total. brood. beg: the sum of all the begging postures on this visit
       29: number.chicks.begging.higher: the number of chicks begging more than the fed chick on this visit
       30: relative.beg.fed.chick.with.zero: how much a chick was begging, relative to all the other chicks on that visit (1 = same as nest mates, >1 = more than nest mates)
   28. fed.chick.beg.rank: the begging rank of the fed chick (1 = fed chick was begging the most (or tied) compared to nestmates, 2 = one chick was begging more intensely than the fed chick, etc)
   29. fed.chick.weight.rank: the size rank (based on mass in g) of the fed chick (1 = largest chick in the nest, 2 = second largest, etc)
   30. fed.chick.relative.weight: the weight of the fed chick compared to the mean weight in the nest (1 = average)
   31. film.brood.mean.weight: the mean weight of the chicks in the filming cross-fostered brood
   32. film.brood.sd.weight: standard deviation of the weights of the chicks in the filming cross-fostered brood
   33. sd.brood.beg.with.zero: standard deviation of the begging postures of the entire brood on that visit
   34. sd.brood.beg.no.zero: standard deviation of the begging postures of begging chicks on that visit
   35. unknown.id.chickx1.beg, unknown.id.chickx2.beg, unknown.id.chickx3.beg, unknown.id.chickx4.beg, unknown.id.chickx5.beg, unknown.id.chickx6.beg, unknown.id.chickx7.beg: begging postures of all chicks, in case the identity of a particular chick could not be recorded, although its begging could be seen.
2. **Field_Study_Data: Chick overview**
   1. chick.ring.number: chick ID
   2. natal. nest: the nest the chick was born into
   3. filming.nest: the nest the chick was filmed in
   4. foster .nest: the nest the chick was cross-fostered to
   5. handfed_y_n: whether the chick was handfed or not prior to filming
   6. survived_to_day_7: whether the chick survived the first 7 days or not
   7. survived_to_day_14: whether the chick survived the first 14 days or not
   8. survived_to_fledge: whether the chick survived the nestling period
   9. survival_outcome: categorical descriptor of survival outcome or when death occurred
   10. mass.day.7: How much the chick weighed in grams on day 7 after hatching
   11. natal. nest.Supplemented: whether the chick came from a supplemented or unsupplemented natal nest.

