import { z } from "zod";
import { AuthenticationCookieRepository } from "./authentication_cookie_repository";

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

export const VerifySchema = z.object({
    headers: z.object({
        // SessionToken in Authorization header (optional - can use cookie instead)
        authorization: z.string().startsWith("SessionToken ").optional(),
        "user-agent": z.string(),
        "x-forwarded-for": z.string(),
        // Cookie header as optional for browser-based navigation
        cookie: z.string().optional(),
    }).refine(
        // Custom validation: must have either SessionToken authorization OR session cookie
        (data) => {
            const hasSessionToken = !!data.authorization;
            const hasSessionCookie = AuthenticationCookieRepository.isSet(data.cookie);
            return hasSessionToken || hasSessionCookie;
        },
        {
            message: "Either SessionToken in Authorization header or session cookie must be provided"
        }
    ),
});
