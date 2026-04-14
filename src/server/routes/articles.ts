import { FastifyInstance } from "fastify";
import {
  getDashboardArticles,
  getAvailableFields,
} from "../../repositories/articles/articlesRepository";
import { getDatasetById } from "../../repositories/datasets/unifiedDatasetsRepository";
import { join } from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { storagePaths } from "../../utils/paths/storagePaths";
import {
  isValidSortField,
  isValidSortOrder,
  DEFAULT_SORT,
  SortParams,
} from "../../shared/sortTypes";
import {
  FilterParams,
  FILTER_KEYS,
  HighProbabilityFilter,
  PdfAvailabilityFilter,
  PdfAvailabilityOption,
  MinImpactScoreFilter,
  MinHumanReviewImpactScoreFilter,
  FieldFilter,
  ReviewStatusFilter,
  ReviewStatusOption,
  TagFilter,
  MetaAnalysisFilter,
  MetaAnalysisOption,
  SourceFilter,
  SourceOption,
} from "../../shared/filterTypes";

export async function articlesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Querystring: {
      sortBy?: string;
      sortOrder?: string;
      [key: `filter_${string}`]: string;
    };
  }>(
    "/articles",
    { config: { requiredRole: "viewer" } },
    async (request, reply) => {
      const { sortBy, sortOrder, ...queryParams } = request.query;

      // Validate and build sort params, falling back to defaults for invalid values
      const sortParams: SortParams = {
        sortBy:
          sortBy && isValidSortField(sortBy) ? sortBy : DEFAULT_SORT.sortBy,
        sortOrder:
          sortOrder && isValidSortOrder(sortOrder)
            ? sortOrder
            : DEFAULT_SORT.sortOrder,
      };

      // Parse filter parameters
      const filters: FilterParams["filters"] = [];

      const highProbabilityParam =
        queryParams[`filter_${FILTER_KEYS.HIGH_PROBABILITY}`];
      if (highProbabilityParam !== undefined) {
        const highProbabilityFilter: HighProbabilityFilter = {
          key: FILTER_KEYS.HIGH_PROBABILITY,
          enabled: highProbabilityParam === "true",
          threshold: 0.5,
        };
        filters.push(highProbabilityFilter);
      }

      const pdfAvailabilityParam =
        queryParams[`filter_${FILTER_KEYS.PDF_AVAILABILITY}`];
      if (pdfAvailabilityParam !== undefined) {
        const validOptions: PdfAvailabilityOption[] = [
          "all",
          "available",
          "not-available",
        ];
        const option = validOptions.includes(
          pdfAvailabilityParam as PdfAvailabilityOption,
        )
          ? (pdfAvailabilityParam as PdfAvailabilityOption)
          : "all";

        const pdfAvailabilityFilter: PdfAvailabilityFilter = {
          key: FILTER_KEYS.PDF_AVAILABILITY,
          option,
        };
        filters.push(pdfAvailabilityFilter);
      }

      const minImpactScoreParam =
        queryParams[`filter_${FILTER_KEYS.MIN_IMPACT_SCORE}`];
      if (minImpactScoreParam !== undefined) {
        const parsed = parseInt(minImpactScoreParam, 10);
        const minImpactScoreFilter: MinImpactScoreFilter = {
          key: FILTER_KEYS.MIN_IMPACT_SCORE,
          minScore:
            !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null,
        };
        filters.push(minImpactScoreFilter);
      }

      const minHumanReviewImpactScoreParam =
        queryParams[`filter_${FILTER_KEYS.MIN_HUMAN_REVIEW_IMPACT_SCORE}`];
      if (minHumanReviewImpactScoreParam !== undefined) {
        const parsed = parseInt(minHumanReviewImpactScoreParam, 10);
        const minHumanReviewImpactScoreFilter: MinHumanReviewImpactScoreFilter =
          {
            key: FILTER_KEYS.MIN_HUMAN_REVIEW_IMPACT_SCORE,
            minScore:
              !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null,
          };
        filters.push(minHumanReviewImpactScoreFilter);
      }

      const fieldParam = queryParams[`filter_${FILTER_KEYS.FIELD}`];
      if (fieldParam !== undefined) {
        const fieldFilter: FieldFilter = {
          key: FILTER_KEYS.FIELD,
          selectedField: fieldParam !== "" ? fieldParam : null,
        };
        filters.push(fieldFilter);
      }

      const reviewStatusParam =
        queryParams[`filter_${FILTER_KEYS.REVIEW_STATUS}`];
      if (reviewStatusParam !== undefined) {
        const validOptions: ReviewStatusOption[] = [
          "all",
          "has_review",
          "no_review",
          "true_positive",
          "false_positive",
          "ambiguous",
        ];
        const isValid =
          typeof reviewStatusParam === "string" &&
          validOptions.includes(reviewStatusParam as ReviewStatusOption);

        const reviewStatusFilter: ReviewStatusFilter = {
          key: FILTER_KEYS.REVIEW_STATUS,
          option: isValid ? (reviewStatusParam as ReviewStatusOption) : "all",
        };
        filters.push(reviewStatusFilter);
      }

      const tagParam = queryParams[`filter_${FILTER_KEYS.TAG}`];
      if (tagParam !== undefined) {
        const tagFilter: TagFilter = {
          key: FILTER_KEYS.TAG,
          selectedTagIds:
            tagParam !== ""
              ? tagParam.split(",").filter((id) => id !== "")
              : [],
        };
        filters.push(tagFilter);
      }

      const metaAnalysisParam =
        queryParams[`filter_${FILTER_KEYS.META_ANALYSIS}`];
      if (metaAnalysisParam !== undefined) {
        const validOptions: MetaAnalysisOption[] = ["all", "exclude", "only"];
        const option = validOptions.includes(
          metaAnalysisParam as MetaAnalysisOption,
        )
          ? (metaAnalysisParam as MetaAnalysisOption)
          : "exclude";

        const metaAnalysisFilter: MetaAnalysisFilter = {
          key: FILTER_KEYS.META_ANALYSIS,
          option,
        };
        filters.push(metaAnalysisFilter);
      }

      const sourceParam = queryParams[`filter_${FILTER_KEYS.SOURCE}`];
      if (sourceParam !== undefined) {
        const validOptions: SourceOption[] = ["all", "dryad", "pmc"];
        const option = validOptions.includes(sourceParam as SourceOption)
          ? (sourceParam as SourceOption)
          : "all";

        const sourceFilter: SourceFilter = {
          key: FILTER_KEYS.SOURCE,
          option,
        };
        filters.push(sourceFilter);
      }

      const filterParams: FilterParams = { filters };

      const articles = await getDashboardArticles(sortParams, filterParams);
      return reply.send({ articles });
    },
  );

  fastify.get<{
    Params: { datasetId: string; filename: string };
  }>(
    "/datasets/:datasetId/pdf/:filename",
    { config: { requiredRole: "viewer" } },
    async (request, reply) => {
      const { datasetId, filename } = request.params;

      const datasetIdNum = parseInt(datasetId, 10);
      if (isNaN(datasetIdNum)) {
        return reply.status(400).send({ error: "Invalid dataset ID" });
      }

      const dataset = await getDatasetById(datasetIdNum);
      if (!dataset) {
        return reply.status(404).send({ error: "Dataset not found" });
      }

      const dir =
        dataset.source === "pmc"
          ? storagePaths.pmcArticle(dataset.extId)
          : storagePaths.dryadDataset(dataset.extId);

      const pdfPath = join(dir, filename);

      // Check if file exists
      if (!existsSync(pdfPath)) {
        return reply.status(404).send({ error: "PDF file not found" });
      }

      // Stream the file
      const stream = createReadStream(pdfPath);
      return reply.type("application/pdf").send(stream);
    },
  );

  fastify.get(
    "/articles/fields",
    { config: { requiredRole: "viewer" } },
    async (request, reply) => {
      const fields = await getAvailableFields();
      return reply.send({ fields });
    },
  );
}
