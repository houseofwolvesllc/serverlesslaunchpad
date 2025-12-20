import { z } from "zod";

/**
 * Zod schemas for sessions endpoints
 */

export const GetSessionsSchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    body: z.object({
        // Accept pagination instruction as plain JSON object
        pagingInstruction: z.any().optional()
    })
});

export const DeleteSessionsSchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    body: z.object({
        sessionIds: z.array(z.string()).min(1, "Must provide at least one session ID"),
        _method: z.string().optional() // Allow method override for DELETE via POST
    })
});

export type GetSessionsMessage = z.infer<typeof GetSessionsSchema>;
export type DeleteSessionsMessage = z.infer<typeof DeleteSessionsSchema>;