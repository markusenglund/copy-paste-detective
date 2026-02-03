import { ArticleForUpload } from "../types/article";
import { SortParams } from "../../../shared/sortTypes";
import { FilterParams, serializeFilters } from "../../../shared/filterTypes";
import { DatasetDetails, HumanReview } from "../types/dataset";
import { StatisticsResponse } from "../types/statistics";
import { PubPeerResponseSchema } from "./pubpeerSchema";

export type PubPeerResult = { url: string; totalComments: number };

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

export async function fetchDatasetDetails(
  datasetId: number,
): Promise<DatasetDetails> {
  const response = await fetch(`${BASE_URL}/datasets/${datasetId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch dataset details");
  }
  return response.json();
}

export function getExcelDownloadUrl(
  datasetId: number,
  filename: string,
): string {
  return `${BASE_URL}/datasets/${datasetId}/excel/${encodeURIComponent(filename)}`;
}

export function getHighlightedExcelDownloadUrl(
  datasetId: number,
  filename: string,
): string {
  return `${BASE_URL}/datasets/${datasetId}/excel-highlighted/${encodeURIComponent(filename)}`;
}

export async function fetchStatistics(): Promise<StatisticsResponse> {
  const response = await fetch(`${BASE_URL}/statistics`);
  if (!response.ok) {
    throw new Error("Failed to fetch statistics");
  }
  return response.json();
}

export async function fetchPubPeerData(
  doi: string,
): Promise<PubPeerResult | null> {
  try {
    const bareDoi = doi.replace(/^https?:\/\/doi\.org\//, "");

    const response = await fetch(
      "https://pubpeer.com/v3/publications?devkey=PubMedChrome",
      {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({
          browser: "Chrome",
          dois: [bareDoi],
          version: "1.6.2",
        }),
      },
    );

    const parsed = PubPeerResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const match = parsed.data.feedbacks.find((fb) => fb.id === bareDoi);
    if (!match) return null;

    return { url: match.url, totalComments: match.total_comments };
  } catch {
    return null;
  }
}

export async function saveHumanReview(
  datasetId: number,
  review: { verdict: string; impactScore: number; notes: string | null },
): Promise<HumanReview> {
  const response = await fetch(
    `${BASE_URL}/datasets/${datasetId}/human-review`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save human review");
  }

  return response.json();
}
