import { z } from "zod";

const baseAuthorizationMessageSchema = z.object({
    session: z.string(),
    accessToken: z.string(),
});

const authorizeMessageSchema = baseAuthorizationMessageSchema.extend({
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    ipAddress: z.string().ip(),
    userAgent: z.string(),
});

const revokeSessionMessageSchema = baseAuthorizationMessageSchema.extend({
    sessionToRevoke: z.string(),
});

export type AuthorizeMessage = z.infer<typeof authorizeMessageSchema>;
export type ReauthorizeMessage = z.infer<typeof baseAuthorizationMessageSchema>;
export type UnauthorizeMessage = z.infer<typeof baseAuthorizationMessageSchema>;
export type GetSessionsMessage = z.infer<typeof baseAuthorizationMessageSchema>;
export type RevokeSessionMessage = z.infer<typeof revokeSessionMessageSchema>;

const sessionSchema = z.object({
    sessionId: z.string(),
    userId: z.string(),
    ipAddress: z.string().ip(),
    userAgent: z.string(),
    createdDate: z.date(),
    expirationDate: z.date(),
});

export type Session = z.infer<typeof sessionSchema>;

export class InvalidAccessTokenError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
