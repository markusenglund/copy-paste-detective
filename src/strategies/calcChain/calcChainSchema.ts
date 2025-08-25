import { z } from "zod";

export const calcChainSchema = z.object({
  calcChain: z.object({
    c: z.array(
      z.object({
        r: z.string(),
        i: z.number().int().optional(),
        l: z.number().int().optional(),
        s: z.number().int().optional(),
      }),
    ),
  }),
});
