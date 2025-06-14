import {
  CategorizeColumnsFunction,
  ColumnCategorizationParams,
  ColumnCategorization
} from "./ColumnCategorizer";

export const createMockCategorizeColumns = (mockResponse: ColumnCategorization): CategorizeColumnsFunction => {
  return async ({ sheet }: ColumnCategorizationParams): Promise<ColumnCategorization> => {
    console.log(
      `[${sheet.name}] Unique columns:`,
      mockResponse.unique.join(", ")
    );
    console.log(
      `[${sheet.name}] Shared columns:`,
      mockResponse.shared.join(", ")
    );

    return mockResponse;
  };
};