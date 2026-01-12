import { z } from "zod";

// Basic nested schemas

const IdsSchema = z.object({
  openalex: z.string(),
  doi: z.string(),
  pmid: z.string().nullable(),
});

const BiblioSchema = z.object({
  volume: z.string().nullable(),
  issue: z.string().nullable(),
  first_page: z.string().nullable(),
  last_page: z.string().nullable(),
});

const CitationNormalizedPercentileSchema = z.object({
  value: z.number(),
  is_in_top_1_percent: z.boolean(),
  is_in_top_10_percent: z.boolean(),
});

const HasContentSchema = z.object({
  grobid_xml: z.boolean(),
  pdf: z.boolean(),
});

const ApcSchema = z.object({
  value: z.number(),
  currency: z.string(),
  value_usd: z.number(),
});

// Domain, Field, Subfield schemas (used in topics)

const DomainFieldSubfieldSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

// Author and Institution schemas

const AuthorSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  orcid: z.string().nullable(),
});

const InstitutionSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  ror: z.string().nullable(),
  country_code: z.string().nullable(),
  type: z.string().nullable(),
  lineage: z.array(z.string()),
});

const AffiliationSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  ror: z.string().nullable(),
  country_code: z.string().nullable(),
  type: z.string().nullable(),
  lineage: z.array(z.string()),
});

const AuthorshipSchema = z.object({
  author_position: z.string(),
  author: AuthorSchema,
  institutions: z.array(InstitutionSchema),
  countries: z.array(z.string()),
  is_corresponding: z.boolean(),
  raw_author_name: z.string(),
  raw_affiliation_strings: z.array(z.string()),
  affiliations: z.array(AffiliationSchema),
});

// Source and Location schemas

const SourceSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  issn_l: z.string().nullable(),
  issn: z.array(z.string()),
  is_oa: z.boolean(),
  is_in_doaj: z.boolean(),
  is_core: z.boolean(),
  host_organization: z.string().nullable(),
  host_organization_name: z.string().nullable(),
  host_organization_lineage: z.array(z.string()),
  host_organization_lineage_names: z.array(z.string()),
  type: z.string(),
});

const LocationSchema = z.object({
  is_oa: z.boolean(),
  landing_page_url: z.string(),
  pdf_url: z.string().nullable(),
  source: SourceSchema.nullable(),
  license: z.string().nullable(),
  license_id: z.string().nullable(),
  version: z.string().nullable(),
  is_accepted: z.boolean(),
  is_published: z.boolean(),
});

// Open Access schema

const OpenAccessSchema = z.object({
  is_oa: z.boolean(),
  oa_status: z.string(),
  oa_url: z.string().nullable(),
  any_repository_has_fulltext: z.boolean(),
});

// Topics and Keywords schemas

const TopicSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  score: z.number(),
  subfield: DomainFieldSubfieldSchema,
  field: DomainFieldSubfieldSchema,
  domain: DomainFieldSubfieldSchema,
});

const KeywordSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  score: z.number(),
});

// MeSH schema

const MeshSchema = z.object({
  descriptor_ui: z.string(),
  descriptor_name: z.string(),
  qualifier_ui: z.string(),
  qualifier_name: z.string(),
  is_major_topic: z.boolean(),
});

// Sustainable Development Goals schema

const SustainableDevelopmentGoalSchema = z.object({
  score: z.number(),
  id: z.string(),
  display_name: z.string(),
});

// Funder schema

const FunderSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  ror: z.string().nullable(),
});

// Counts by year schema

const CountsByYearSchema = z.object({
  year: z.number(),
  cited_by_count: z.number(),
});

// Main Work schema

export const WorkSchema = z.object({
  id: z.string(),
  doi: z.string(),
  title: z.string(),
  display_name: z.string(),
  publication_year: z.number(),
  publication_date: z.string(),
  ids: IdsSchema,
  language: z.string().nullable(),
  primary_location: LocationSchema.nullable(),
  type: z.string(),
  type_crossref: z.string().nullable(),
  indexed_in: z.array(z.string()),
  open_access: OpenAccessSchema,
  authorships: z.array(AuthorshipSchema),
  institution_assertions: z.array(z.unknown()),
  countries_distinct_count: z.number(),
  institutions_distinct_count: z.number(),
  corresponding_author_ids: z.array(z.string()),
  corresponding_institution_ids: z.array(z.string()),
  apc_list: ApcSchema.nullable(),
  apc_paid: ApcSchema.nullable(),
  fwci: z.number().nullable(),
  has_fulltext: z.boolean(),
  fulltext_origin: z.string().nullable(),
  cited_by_count: z.number(),
  citation_normalized_percentile: CitationNormalizedPercentileSchema.nullable(),
  cited_by_percentile_year: z
    .object({
      min: z.number(),
      median: z.number(),
      max: z.number(),
    })
    .nullable(),
  biblio: BiblioSchema,
  is_retracted: z.boolean(),
  is_paratext: z.boolean(),
  primary_topic: TopicSchema.nullable(),
  topics: z.array(TopicSchema),
  keywords: z.array(KeywordSchema),
  mesh: z.array(MeshSchema),
  locations_count: z.number(),
  locations: z.array(LocationSchema),
  best_oa_location: LocationSchema.nullable(),
  sustainable_development_goals: z.array(SustainableDevelopmentGoalSchema),
  grants: z.array(z.unknown()),
  datasets: z.array(z.unknown()),
  versions: z.array(z.unknown()),
  funders: z.array(FunderSchema),
  has_content: HasContentSchema,
  referenced_works_count: z.number(),
  referenced_works: z.array(z.string()),
  related_works: z.array(z.string()),
  abstract_inverted_index: z.record(z.string(), z.array(z.number())).nullable(),
  cited_by_api_url: z.string(),
  counts_by_year: z.array(CountsByYearSchema),
  updated_date: z.string(),
  created_date: z.string(),
});

// Work with relevance_score (for search results)

export const WorkSearchResultSchema = WorkSchema.extend({
  relevance_score: z.number(),
});

// Search results schema (for getArticleByTitle)

export const WorkSearchResultsSchema = z.object({
  meta: z.object({
    count: z.number(),
    db_response_time_ms: z.number(),
    page: z.number(),
    per_page: z.number(),
    groups_count: z.number().nullable(),
  }),
  results: z.array(WorkSearchResultSchema),
  group_by: z.array(z.unknown()),
});

// Export inferred types

export type Work = z.infer<typeof WorkSchema>;
export type WorkSearchResult = z.infer<typeof WorkSearchResultSchema>;
export type WorkSearchResults = z.infer<typeof WorkSearchResultsSchema>;
