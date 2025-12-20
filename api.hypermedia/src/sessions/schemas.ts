import { z } from "zod";

/**
 * Zod schemas for sessions endpoints
 */

export const GetSessionsSchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    query: z.object({
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 25),
        cursor: z.string().optional()
    })
});

export const DeleteSessionsSchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    body: z.object({
        sessionIds: z.array(z.string()).min(1, "Must provide at least one session ID")
    })
});

export type GetSessionsMessage = z.infer<typeof GetSessionsSchema>;
export type DeleteSessionsMessage = z.infer<typeof DeleteSessionsSchema>;