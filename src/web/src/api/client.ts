import { ArticleForUpload } from "../types/article";
import { SortParams } from "../../../shared/sortTypes";
import { FilterParams, serializeFilters } from "../../../shared/filterTypes";

const BASE_URL = "/api";

export async function fetchArticles(
  sortParams?: SortParams,
  filterParams?: FilterParams,
): Promise<ArticleForUpload[]> {
  let url = `${BASE_URL}/articles`;

  const params = new URLSearchParams();

  if (sortParams) {
    params.append("sortBy", sortParams.sortBy);
    params.append("sortOrder", sortParams.sortOrder);
  }

  if (filterParams) {
    const serializedFilters = serializeFilters(filterParams);
    Object.entries(serializedFilters).forEach(([key, value]) => {
      params.append(key, value);
    });
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch articles");
  }
  const data = await response.json();
  return data.articles;
}

export async function uploadPdf(
  articleId: number,
  file: File,
): Promise<{ success: boolean; filePath: string; articleId: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/articles/${articleId}/pdf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload PDF");
  }

  return response.json();
}
