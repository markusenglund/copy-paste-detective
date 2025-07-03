import { z } from "zod";

// Author schema
const AuthorSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  affiliation: z.string().optional(),
  affiliationROR: z.string().optional(),
  affiliations: z
    .array(
      z.object({
        name: z.string(),
        ror_id: z.string().optional(),
      }),
    )
    .optional(),
  orcid: z.string().optional(),
});

// Funder schema
const FunderSchema = z.object({
  organization: z.string().optional(),
  identifier: z.string().optional(),
  awardNumber: z.string().optional(),
});

// Location schema
const LocationSchema = z.object({
  place: z.string().optional(),
  point: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  box: z
    .object({
      swLongitude: z.number(),
      swLatitude: z.number(),
      neLongitude: z.number(),
      neLatitude: z.number(),
    })
    .optional(),
});

// Related work schema
const RelatedWorkSchema = z.object({
  relationship: z.string(),
  identifierType: z.string(),
  identifier: z.string(),
});

// License schema - it's just a string
const LicenseSchema = z.string();

// Links schema
const LinksSchema = z.object({
  self: z
    .object({
      href: z.string(),
    })
    .optional(),
  "stash:versions": z
    .object({
      href: z.string(),
    })
    .optional(),
  "stash:version": z.object({
    href: z.string(),
  }),
  "stash:download": z
    .object({
      href: z.string(),
    })
    .optional(),
  curies: z.array(
    z.object({
      name: z.string(),
      href: z.string(),
      templated: z.string().optional(),
    }),
  ),
});

// Individual dataset schema
const DatasetSchema = z.object({
  id: z.number(),
  identifier: z.string(),
  storageSize: z.number().optional(),
  title: z.string(),
  authors: z.array(AuthorSchema),
  abstract: z.string(),
  usageNotes: z.string().optional(),
  funders: z.array(FunderSchema).optional(),
  keywords: z.array(z.string()).optional(),
  locations: z.array(LocationSchema).optional(),
  relatedWorks: z.array(RelatedWorkSchema).optional(),
  relatedPublicationISSN: z.string().optional(),
  license: LicenseSchema.optional(),
  versionNumber: z.number().optional(),
  versionStatus: z.string().optional(),
  versionChanges: z.string().optional(),
  curationStatus: z.string().optional(),
  publicationDate: z.string(),
  lastModificationDate: z.string(),
  visibility: z.string().optional(),
  sharingLink: z.string().optional(),
  _links: LinksSchema,
});

// Pagination links schema
const PaginationLinksSchema = z.object({
  self: z.object({
    href: z.string(),
  }),
  first: z
    .object({
      href: z.string(),
    })
    .optional(),
  last: z
    .object({
      href: z.string(),
    })
    .optional(),
  next: z
    .object({
      href: z.string(),
    })
    .optional(),
  prev: z
    .object({
      href: z.string(),
    })
    .optional(),
});

// Main API response schema
export const DatasetResponseSchema = z.object({
  _links: PaginationLinksSchema,
  count: z.number(),
  total: z.number(),
  _embedded: z.object({
    "stash:datasets": z.array(DatasetSchema),
  }),
});

const FileSchema = z.object({
  _links: z.object({
    self: z.object({
      href: z.string(),
    }),
    "stash:version": z.object({
      href: z.string(),
    }),
    "stash:download": z.object({
      href: z.string(),
    }),
    curies: z.array(
      z.object({
        name: z.string(),
        href: z.string(),
        templated: z.string().optional(),
      }),
    ),
  }),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
  status: z.string(),
  digest: z.string().optional(),
  digestType: z.string().optional(),
});

export const FilesResponseSchema = z.object({
  _links: PaginationLinksSchema,
  count: z.number(),
  total: z.number(),
  _embedded: z.object({
    "stash:files": z.array(FileSchema),
  }),
});

// Export the inferred type
export type DatasetResponse = z.infer<typeof DatasetResponseSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type FilesResponse = z.infer<typeof FilesResponseSchema>;
export type File = z.infer<typeof FileSchema>;
