import { z } from "zod";

/**
 * Zod schemas for API keys endpoints
 */

export const GetApiKeysSchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    body: z.object({
        // Accept pagination instruction as plain JSON object
        pagingInstruction: z.any().optional()
    })
});

export const DeleteApiKeysSchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    body: z.object({
        apiKeyIds: z.array(z.string()).min(1, "Must provide at least one API key ID")
    })
});

export type GetApiKeysMessage = z.infer<typeof GetApiKeysSchema>;
export type DeleteApiKeysMessage = z.infer<typeof DeleteApiKeysSchema>;