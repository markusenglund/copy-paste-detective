import { db } from "../../db";
import { articles, articleAuthors } from "../../repositories/articles/schema";
import { journals } from "../../repositories/journals/schema";
import { aiReviewResults } from "../../repositories/aiReviewResults/schema";
import { aiPdfReviewResults } from "../../repositories/aiPdfReviewResults/schema";
import { institutions } from "../../repositories/institutions/schema";
import { pdfFiles } from "../../repositories/pdfFiles/schema";
import {
  desc,
  eq,
  sql,
  and,
  asc,
  SQL,
  gt,
  isNull,
  isNotNull,
} from "drizzle-orm";
import {
  AI_REVIEW_MIN_DATE,
  PDF_REVIEW_MIN_DATE,
} from "../../repositories/aiReviewResults/aiReviewResultsRepository";
import {
  SortParams,
  SORT_FIELDS,
  SORT_ORDERS,
  DEFAULT_SORT,
} from "../../shared/sortTypes";
import {
  FilterParams,
  FILTER_KEYS,
  DEFAULT_FILTERS,
} from "../../shared/filterTypes";

export interface ArticleForUpload {
  id: number;
  doi: string | null;
  title: string;
  fullPdfUrl: string | null;
  publicationDate: string | null;
  numCitations: number;
  pdfDownloadStatus: string | null;
  journalTitle: string | null;
  truePositiveProbability: number | null;
  impactScore: number | null;
  citationNormalizedPercentile: number | null;
  subfield: string | null;
  countryCode: string | null;
  pdfFilename: string | null;
  pdfFileSize: number | null;
}

export async function getArticlesForManualUpload(
  sortParams: SortParams = DEFAULT_SORT,
  filterParams: FilterParams = DEFAULT_FILTERS,
): Promise<ArticleForUpload[]> {
  // Step 1: Get latest review timestamp per unique sheet
  const latestExcelReviewTimes = sql`(
    SELECT
      dryad_dataset_id,
      dryad_excel_file_id,
      sheet_name,
      MAX(created_at) as max_created_at
    FROM ai_review_results
    WHERE created_at > ${AI_REVIEW_MIN_DATE}
    GROUP BY dryad_dataset_id, dryad_excel_file_id, sheet_name
  )`;

  // Step 2: Get latest PDF review for each ai_review_result (in case multiple PDF reviews exist)
  const latestPdfPerReview = sql`(
    SELECT
      ai_review_result_id,
      MAX(created_at) as max_pdf_created_at
    FROM ai_pdf_review_results
    WHERE created_at > ${PDF_REVIEW_MIN_DATE}
    GROUP BY ai_review_result_id
  )`;

  // Step 3: Get max probability and max impact score from those latest reviews per dataset
  // The key is that impactScore comes from the PDF review of the SAME ai_review_result
  const maxScoresSubquery = db
    .select({
      dryadDatasetId: aiReviewResults.dryadDatasetId,
      maxTruePositiveProbability:
        sql<number>`MAX(${aiReviewResults.truePositiveProbability})`.as(
          "max_true_positive_probability",
        ),
      maxImpactScore: sql<number>`MAX(${aiPdfReviewResults.impactScore})`.as(
        "max_impact_score",
      ),
    })
    .from(aiReviewResults)
    .innerJoin(
      sql`${latestExcelReviewTimes} latest_excel`,
      sql`${aiReviewResults.dryadDatasetId} = latest_excel.dryad_dataset_id
          AND ${aiReviewResults.dryadExcelFileId} = latest_excel.dryad_excel_file_id
          AND ${aiReviewResults.sheetName} = latest_excel.sheet_name
          AND ${aiReviewResults.createdAt} = latest_excel.max_created_at`,
    )
    .leftJoin(
      aiPdfReviewResults,
      eq(aiPdfReviewResults.aiReviewResultId, aiReviewResults.id),
    )
    .leftJoin(
      sql`${latestPdfPerReview} latest_pdf`,
      sql`${aiPdfReviewResults.aiReviewResultId} = latest_pdf.ai_review_result_id
          AND ${aiPdfReviewResults.createdAt} = latest_pdf.max_pdf_created_at`,
    )
    .where(
      sql`latest_pdf.ai_review_result_id IS NOT NULL OR ${aiPdfReviewResults.id} IS NULL`,
    )
    .groupBy(aiReviewResults.dryadDatasetId)
    .as("max_scores");

  // Helper function to map sort field to database column
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getSortColumn = () => {
    switch (sortParams.sortBy) {
      case SORT_FIELDS.PROBABILITY:
        return maxScoresSubquery.maxTruePositiveProbability;
      case SORT_FIELDS.IMPACT:
        return maxScoresSubquery.maxImpactScore;
      case SORT_FIELDS.PUBLISHED:
        return articles.publicationDate;
      case SORT_FIELDS.CITATIONS:
        return articles.numCitations;
      case SORT_FIELDS.CITATION_PERCENTILE:
        return articles.citationNormalizedPercentile;
      default:
        return maxScoresSubquery.maxTruePositiveProbability;
    }
  };

  const sortColumn = getSortColumn();
  const orderByClause =
    sortParams.sortOrder === SORT_ORDERS.DESC
      ? desc(sortColumn)
      : asc(sortColumn);

  // Build filter conditions
  const filterConditions: SQL[] = [];

  for (const filter of filterParams.filters) {
    if (filter.key === FILTER_KEYS.HIGH_PROBABILITY) {
      if (filter.enabled) {
        filterConditions.push(
          gt(maxScoresSubquery.maxTruePositiveProbability, filter.threshold),
        );
      }
    } else if (filter.key === FILTER_KEYS.PDF_AVAILABILITY) {
      if (filter.option === "available") {
        filterConditions.push(isNotNull(pdfFiles.filename));
      } else if (filter.option === "not-available") {
        filterConditions.push(isNull(pdfFiles.filename));
      }
    }
  }

  // Combine filter conditions with AND
  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

  let query = db
    .select({
      id: articles.id,
      doi: articles.doi,
      title: articles.title,
      fullPdfUrl: articles.fullPdfUrl,
      publicationDate: articles.publicationDate,
      numCitations: articles.numCitations,
      pdfDownloadStatus: articles.pdfDownloadStatus,
      journalTitle: journals.title,
      truePositiveProbability: maxScoresSubquery.maxTruePositiveProbability,
      impactScore: maxScoresSubquery.maxImpactScore,
      citationNormalizedPercentile: articles.citationNormalizedPercentile,
      subfield: articles.subfield,
      countryCode: institutions.countryCode,
      pdfFilename: pdfFiles.filename,
      pdfFileSize: pdfFiles.size,
    })
    .from(articles)
    .leftJoin(journals, eq(articles.journalId, journals.id))
    .leftJoin(
      articleAuthors,
      and(
        eq(articleAuthors.articleId, articles.id),
        eq(articleAuthors.authorPosition, "first"),
      ),
    )
    .leftJoin(institutions, eq(articleAuthors.institutionId, institutions.id))
    .leftJoin(pdfFiles, eq(pdfFiles.articleId, articles.id))
    .innerJoin(
      maxScoresSubquery,
      eq(maxScoresSubquery.dryadDatasetId, articles.dryadDatasetId),
    );

  if (whereClause) {
    query = query.where(whereClause) as typeof query;
  }

  const result = await query.orderBy(orderByClause);

  return result;
}
