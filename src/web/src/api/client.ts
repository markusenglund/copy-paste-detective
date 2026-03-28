import { ArticleForUpload } from "../types/article";
import { SortParams } from "../../../shared/sortTypes";
import { FilterParams, serializeFilters } from "../../../shared/filterTypes";
import { DatasetDetails, HumanReview } from "../types/dataset";
import { StatisticsResponse } from "../types/statistics";
import { PubPeerResponseSchema } from "./pubpeerSchema";

export type PubPeerResult = { url: string; totalComments: number };

const BASE_URL = "/api";

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (response.status === 401) {
    const redirectTarget = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(redirectTarget)}`;
    throw new Error("Unauthorized");
  }

  if (response.status === 403) {
    const body = await response
      .clone()
      .json()
      .catch(() => ({}));
    if (body.error === "PASSWORD_CHANGE_REQUIRED") {
      window.location.href = "/reset-password";
      throw new Error("Password change required");
    }
  }

  return response;
}

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

  const response = await apiFetch(url);
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

  const response = await apiFetch(`${BASE_URL}/articles/${articleId}/pdf`, {
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
  const response = await apiFetch(`${BASE_URL}/datasets/${datasetId}`);
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
  const response = await apiFetch(`${BASE_URL}/statistics`);
  if (!response.ok) {
    throw new Error("Failed to fetch statistics");
  }
  return response.json();
}

export async function fetchAvailableFields(): Promise<string[]> {
  const response = await apiFetch(`${BASE_URL}/articles/fields`);
  if (!response.ok) {
    throw new Error("Failed to fetch available fields");
  }
  const data = await response.json();
  return data.fields;
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
  review: {
    verdict: string;
    impactScore: number;
    notes: string | null;
    prosecutionStatusId: string;
  },
): Promise<HumanReview> {
  const response = await apiFetch(
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

export interface ProsecutionStatus {
  id: string;
  name: string;
}

export async function fetchProsecutionStatuses(): Promise<ProsecutionStatus[]> {
  const response = await apiFetch(`${BASE_URL}/prosecution-statuses`);
  if (!response.ok) {
    throw new Error("Failed to fetch prosecution statuses");
  }
  const data = await response.json();
  return data.statuses;
}

export async function createProsecutionStatus(
  name: string,
): Promise<ProsecutionStatus> {
  const response = await apiFetch(`${BASE_URL}/prosecution-statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create prosecution status");
  }

  const data = await response.json();
  return data.status;
}

export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

export async function fetchTags(): Promise<TagInfo[]> {
  const response = await apiFetch(`${BASE_URL}/tags`);
  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }
  const data = await response.json();
  return data.tags;
}

export async function addTagToDataset(
  datasetId: number,
  tagId: string,
): Promise<TagInfo[]> {
  const response = await apiFetch(`${BASE_URL}/datasets/${datasetId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add tag");
  }

  const data = await response.json();
  return data.tags;
}

export async function removeTagFromDataset(
  datasetId: number,
  tagId: string,
): Promise<TagInfo[]> {
  const response = await apiFetch(
    `${BASE_URL}/datasets/${datasetId}/tags/${encodeURIComponent(tagId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove tag");
  }

  const data = await response.json();
  return data.tags;
}
