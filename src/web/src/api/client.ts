import { ArticleForUpload } from "../types/article";
import { SortParams } from "../../../shared/sortTypes";

const BASE_URL = "/api";

export async function fetchArticles(
  sortParams?: SortParams,
): Promise<ArticleForUpload[]> {
  let url = `${BASE_URL}/articles`;

  if (sortParams) {
    const params = new URLSearchParams({
      sortBy: sortParams.sortBy,
      sortOrder: sortParams.sortOrder,
    });
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
