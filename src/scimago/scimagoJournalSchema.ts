import { z } from "zod";

export const JournalSchema = z.object({
  scimagoJournalRank: z.number().int(),
  title: z.string(),
  issns: z.array(z.string()),
  scimagoJournalScore: z.number().nullish(),
  avgNumCitations: z.number().nullish(),
});

export type Journal = z.infer<typeof JournalSchema>;
