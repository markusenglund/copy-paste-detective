import { FastifyInstance } from "fastify";
import { getDashboardArticles } from "../../repositories/articles/articlesRepository";
import { join } from "node:path";
import { existsSync, createReadStream } from "node:fs";
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
} from "../../shared/filterTypes";

export async function articlesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Querystring: {
      sortBy?: string;
      sortOrder?: string;
      [key: `filter_${string}`]: string;
    };
  }>("/articles", async (request, reply) => {
    const { sortBy, sortOrder, ...queryParams } = request.query;

    // Validate and build sort params, falling back to defaults for invalid values
    const sortParams: SortParams = {
      sortBy: sortBy && isValidSortField(sortBy) ? sortBy : DEFAULT_SORT.sortBy,
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
        minScore: !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null,
      };
      filters.push(minImpactScoreFilter);
    }

    const filterParams: FilterParams = { filters };

    const articles = await getDashboardArticles(sortParams, filterParams);
    return reply.send({ articles });
  });

  fastify.get<{
    Params: { articleId: string; filename: string };
  }>("/articles/:articleId/pdf/:filename", async (request, reply) => {
    const { articleId, filename } = request.params;

    // Construct the path to the PDF file
    const pdfPath = join(process.cwd(), "data", "pdfs", articleId, filename);

    // Check if file exists
    if (!existsSync(pdfPath)) {
      return reply.status(404).send({ error: "PDF file not found" });
    }

    // Stream the file
    const stream = createReadStream(pdfPath);
    return reply.type("application/pdf").send(stream);
  });
}
