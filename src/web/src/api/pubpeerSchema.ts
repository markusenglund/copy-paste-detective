import { z } from "zod";

const PubPeerFeedbackSchema = z.object({
  id: z.string(),
  title: z.string(),
  total_comments: z.number(),
  url: z.string(),
});

export const PubPeerResponseSchema = z.object({
  status: z.string(),
  feedbacks: z.array(PubPeerFeedbackSchema),
});
