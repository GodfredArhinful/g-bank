import { z } from "zod";

// The one error shape every endpoint returns. See docs/04-api.md section 4.2.
export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;
