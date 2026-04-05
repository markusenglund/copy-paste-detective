import { z } from "zod";

const YesNo = z.enum(["Y", "N"]);

const SearchResultArticleSchema = z.object({
  id: z.string(),
  source: z.string(),
  pmid: z.string().optional(),
  pmcid: z.string(),
  doi: z.string().optional(),
  title: z.string(),
  authorString: z.string().optional(),
  journalInfo: z
    .object({
      journal: z
        .object({
          issn: z.string().optional(),
          title: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  abstractText: z.string().optional(),
  pubYear: z.string().optional(),
  isOpenAccess: YesNo.optional(),
  hasSuppl: YesNo.optional(),
  citedByCount: z.number(),
  firstPublicationDate: z.string(),
});

export type SearchResultArticle = z.infer<typeof SearchResultArticleSchema>;

export const SearchResponseSchema = z.object({
  hitCount: z.number(),
  nextCursorMark: z.string(),
  request: z.object({
    queryString: z.string(),
    resultType: z.string(),
    cursorMark: z.string(),
    pageSize: z.number(),
    sort: z.string(),
  }),
  resultList: z.object({
    result: z.array(SearchResultArticleSchema),
  }),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// S3 metadata response
const S3MetadataSchema = z.object({
  pmcid: z.string(),
  version: z.number(),
  pmid: z.number().nullable(),
  doi: z.string().nullable(),
  title: z.string(),
  is_retracted: z.boolean(),
  license_code: z.string().nullable(),
  pdf_url: z.string().nullish(),
  text_url: z.string().nullish(),
  xml_url: z.string().nullish(),
  media_urls: z.array(z.string()).default([]),
});

export type S3Metadata = z.infer<typeof S3MetadataSchema>;

export { S3MetadataSchema };

// S3 ListBucketResult response (list-type=2 with delimiter)
const S3CommonPrefixSchema = z.object({
  Prefix: z.string(),
});

export const S3ListBucketResultSchema = z.object({
  ListBucketResult: z.object({
    CommonPrefixes: z.array(S3CommonPrefixSchema).optional(),
  }),
});
