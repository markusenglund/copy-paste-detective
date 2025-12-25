import {
  RepeatedColumnSequencesResult,
  StrategyName,
  StrategyDependencies,
} from "../../types/strategies";
import { ExcelFileData } from "../../types/ExcelFileData";
import {
  RepeatedColumnSequence,
  type Position,
} from "../../entities/RepeatedColumnSequence";
import { calculateColumnSequenceEntropyScore } from "../../utils/entropy";
import { CategorizedColumn } from "../../columnCategorization/columnCategorization";

export async function runRepeatedColumnSequencesStrategy(
  excelFileData: ExcelFileData,
  { categorizedColumnsBySheet }: StrategyDependencies,
): Promise<RepeatedColumnSequencesResult> {
  const startTime = performance.now();

  const repeatedColumnSequences: RepeatedColumnSequence[] = [];

  for (const sheet of excelFileData.sheets) {
    const categorizedColumns = categorizedColumnsBySheet.get(sheet.name);
    if (!categorizedColumns) {
      throw new Error(`Categorized columns not found for sheet: ${sheet.name}`);
    }
    const sheetRepeatedColumnSequences = findRepeatedSequences(
      sheet,
      categorizedColumns,
    );

    repeatedColumnSequences.push(...sheetRepeatedColumnSequences);
  }

  const sortedSequences = repeatedColumnSequences
    .toSorted((a, b) => {
      return (
        (b.matrixSizeAdjustedEntropyScore || 0) -
        (a.matrixSizeAdjustedEntropyScore || 0)
      ); // Use || 0 to handle NaN values. TODO: Fix this in the findRepeatedSequences function
    })
    .filter((sequence) => sequence.matrixSizeAdjustedEntropyScore > 1);

  const deduplicatedSortedSequences =
    deduplicateSortedSequences(sortedSequences);

  const executionTime = performance.now() - startTime;

  return {
    name: StrategyName.RepeatedColumnSequences,
    executionTime,
    sequences: deduplicatedSortedSequences,
  };
}

function deduplicateSortedSequences(
  repeatedSequences: RepeatedColumnSequence[],
): RepeatedColumnSequence[] {
  let previousSequence: RepeatedColumnSequence | null = null;
  const deduplicatedSortedSequences: RepeatedColumnSequence[] = [];
  for (const repeatedSequence of repeatedSequences) {
    if (previousSequence) {
      const isSameSequence =
        previousSequence.adjustedSequenceEntropyScore ===
          repeatedSequence.adjustedSequenceEntropyScore &&
        previousSequence.values.every((value, index) => {
          return value === repeatedSequence.values[index];
        });
      if (isSameSequence) {
        repeatedSequence.sequences.forEach((sequence) => {
          // Check if position already exists in previousSequence and if not, add it
          const exists = previousSequence?.sequences.find(
            (s) => s.startCellId === sequence.startCellId,
          );
          if (!exists) {
            previousSequence?.sequences.push(sequence);
          }
        });
        continue;
      }
    }
    deduplicatedSortedSequences.push(repeatedSequence);
    previousSequence = repeatedSequence;
  }
  return deduplicatedSortedSequences;
}

function findRepeatedSequences(
  sheet: Sheet,
  categorizedColumns: CategorizedColumn[],
): RepeatedColumnSequence[] {
  // Get numeric columns that should be unique
  const uniqueColumnIndices = categorizedColumns
    .filter((col) => col.isIncludedInAnalysis)
    .map((col) => col.index)
    .filter((index) => sheet.numericColumnIndices.includes(index));

  if (uniqueColumnIndices.length === 0) {
    return [];
  }

  const columns = sheet.getColumns();

  const matrix = sheet.invertedEnhancedMatrix;

  const repeatedSequences: RepeatedColumnSequence[] = [];
  const previouslySeenPositionsByValue = new Map<number, Position[]>();
  const checkedPositionPairs = new Set<string>();
  for (const columnIndex of uniqueColumnIndices) {
    for (let rowIndex = 0; rowIndex < matrix[columnIndex].length; rowIndex++) {
      if (repeatedSequences.length > 1000) {
        // Limit the number of sequences to avoid memory issues
        break;
      }
      const cellData = matrix[columnIndex]?.[rowIndex];
      if (cellData?.isAnalyzable) {
        const cellValue = cellData.value as number;
        const previouslySeenPositions =
          previouslySeenPositionsByValue.get(cellValue) ?? [];
        const newPosition: Position = {
          column: columnIndex,
          startRow: rowIndex,
          cellId: cellData.cellId,
        };

        if (previouslySeenPositions.length < 100) {
          for (const previouslySeenPosition of previouslySeenPositions) {
            if (
              checkedPositionPairs.has(
                `${previouslySeenPosition.column}-${previouslySeenPosition.startRow}-${columnIndex}-${rowIndex}`,
              )
            ) {
              continue;
            }
            // If the values are on the same row, skip since this is often expected to be the case in legitimate data
            if (previouslySeenPosition.startRow === rowIndex) {
              continue;
            }

            let length = 1;
            const repeatedValues: number[] = [cellValue];
            while (true) {
              const isPreviouslySeenPositionAnalyzable =
                matrix[previouslySeenPosition.column][
                  previouslySeenPosition.startRow + length
                ]?.isAnalyzable;
              if (!isPreviouslySeenPositionAnalyzable) {
                break;
              }

              const isComparingCellWithItself =
                previouslySeenPosition.column === columnIndex &&
                rowIndex === previouslySeenPosition.startRow + length;
              if (isComparingCellWithItself) {
                break;
              }
              const areValuesIdentical =
                matrix[previouslySeenPosition.column][
                  previouslySeenPosition.startRow + length
                ].value === matrix[columnIndex][rowIndex + length]?.value;
              if (!areValuesIdentical) {
                break;
              }

              repeatedValues.push(
                matrix[previouslySeenPosition.column][
                  previouslySeenPosition.startRow + length
                ].value as number,
              );
              checkedPositionPairs.add(
                `${previouslySeenPosition.column}-${previouslySeenPosition.startRow + length}-${columnIndex}-${rowIndex + length}`,
              );
              length++;
            }

            const minSequenceLength = 2;
            if (repeatedValues.length < minSequenceLength) {
              continue;
            }
            const minSequenceEntropyScore = 10;
            const categorizedColumn = categorizedColumns[columnIndex];
            const sequenceEntropyScore = calculateColumnSequenceEntropyScore(
              repeatedValues,
              categorizedColumn,
            );

            if (sequenceEntropyScore <= minSequenceEntropyScore) {
              continue;
            }
            if (
              previouslySeenPosition.column === newPosition.column &&
              previouslySeenPosition.startRow + length === newPosition.startRow
            ) {
              // Skip if the repeated sequences are back-to-back
              continue;
            }
            const repeatedSequence = new RepeatedColumnSequence({
              sequences: [
                {
                  startRowIndex: previouslySeenPosition.startRow,
                  startCellId: previouslySeenPosition.cellId,
                  column: columns[previouslySeenPosition.column],
                },
                {
                  startRowIndex: newPosition.startRow,
                  startCellId: newPosition.cellId,
                  column: columns[newPosition.column],
                },
              ],
              values: repeatedValues,
              sheet,
              categorizedColumn,
            });
            if (repeatedSequence.matrixSizeAdjustedEntropyScore > 2) {
              repeatedSequences.push(repeatedSequence);
            }
          }
        }
        previouslySeenPositions.push(newPosition);
        previouslySeenPositionsByValue.set(cellValue, previouslySeenPositions);
      }
    }
  }

  return repeatedSequences;
}
