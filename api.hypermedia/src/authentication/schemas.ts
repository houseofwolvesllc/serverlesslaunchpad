import { z } from "zod";

/**
 * Zod schemas for authentication endpoints
 */

export const AuthenticateSchema = z.object({
    apiKey: z.string().optional(),
    sessionToken: z.string().optional(),
}).refine(
    (data) => data.apiKey || data.sessionToken,
    {
        message: "Either apiKey or sessionToken must be provided",
    }
);

export type AuthenticateMessage = z.infer<typeof AuthenticateSchema>;