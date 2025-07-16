import { z } from "zod";

/**
 * Zod schemas for authentication endpoints
 */
// Define the authentication request schema
export const AuthenticateSchema = z.object({
    headers: z.object({
        authorization: z.string().startsWith("Bearer "),
        "user-agent": z.string(),
        "x-forwarded-for": z.string(),
    }),
    body: z.object({
        sessionKey: z.string(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
    }),
});

export const SignoutSchema = z.object({
    headers: z.object({
        authorization: z.string().startsWith("SessionToken "),
        "user-agent": z.string(),
        "x-forwarded-for": z.string(),
    }),
});
