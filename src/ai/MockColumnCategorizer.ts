import {
  CategorizeColumnsFunction,
  ColumnCategorizationParams,
  ColumnCategorization
} from "./ColumnCategorizer";

export const createMockCategorizeColumns = (
  mockResponse: ColumnCategorization
): CategorizeColumnsFunction => {
  return async ({
    sheet: _sheet
  }: ColumnCategorizationParams): Promise<ColumnCategorization> => {
    return mockResponse;
  };
};
