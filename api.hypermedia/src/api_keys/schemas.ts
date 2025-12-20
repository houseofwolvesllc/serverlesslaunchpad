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

export const CreateApiKeySchema = z.object({
    params: z.object({
        userId: z.string()
    }),
    body: z.object({
        label: z.string().min(1, "Label is required").max(255, "Label too long (max 255 characters)")
    })
});

export type GetApiKeysMessage = z.infer<typeof GetApiKeysSchema>;
export type DeleteApiKeysMessage = z.infer<typeof DeleteApiKeysSchema>;
export type CreateApiKeyMessage = z.infer<typeof CreateApiKeySchema>;