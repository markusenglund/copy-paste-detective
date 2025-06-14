import { z } from "zod";

export const MetadataFileSchema = z.object({
  name: z.string()
});

export const MetadataSchema = z.object({
  name: z.string(),
  files: z.array(MetadataFileSchema)
});

export type Metadata = z.infer<typeof MetadataSchema>;
export type MetadataFile = z.infer<typeof MetadataFileSchema>;