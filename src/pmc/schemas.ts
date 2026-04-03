import { z } from "zod";

const YesNo = z.enum(["Y", "N"]);

const SearchResultArticleSchema = z.object({
  id: z.string(),
  source: z.string(),
  pmid: z.string(),
  pmcid: z.string(),
  fullTextIdList: z.object({
    fullTextId: z.array(z.string()),
  }),
  doi: z.string(),
  title: z.string(),
  authorString: z.string(),
  journalTitle: z.string(),
  issue: z.string().optional(),
  journalVolume: z.string(),
  pubYear: z.string(),
  journalIssn: z.string(),
  pageInfo: z.string(),
  pubType: z.string(),
  isOpenAccess: YesNo,
  inEPMC: YesNo,
  inPMC: YesNo,
  hasPDF: YesNo,
  hasBook: YesNo,
  hasSuppl: YesNo,
  citedByCount: z.number(),
  hasReferences: YesNo,
  hasTextMinedTerms: YesNo,
  hasDbCrossReferences: YesNo,
  hasLabsLinks: YesNo,
  hasTMAccessionNumbers: YesNo,
  firstIndexDate: z.string(),
  firstPublicationDate: z.string(),
  // Optional fields (not present on every result)
  dbCrossReferenceList: z
    .object({ dbName: z.array(z.string()).optional() })
    .optional(),
  tmAccessionTypeList: z
    .object({ accessionType: z.array(z.string()).optional() })
    .optional(),
});

export type SearchResultArticle = z.infer<typeof SearchResultArticleSchema>;

export const SearchResponseSchema = z.object({
  version: z.string(),
  hitCount: z.number(),
  nextCursorMark: z.string(),
  nextPageUrl: z.string(),
  request: z.object({
    queryString: z.string(),
    resultType: z.string(),
    cursorMark: z.string(),
    pageSize: z.number(),
    sort: z.string(),
    synonym: z.boolean(),
  }),
  resultList: z.object({
    result: z.array(SearchResultArticleSchema),
  }),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
