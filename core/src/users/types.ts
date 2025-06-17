import { z } from "zod";

export enum Role {
    Base,
    Support,
    AccountManager,
    Admin,
}

export enum Features {
    None = 0,
    Contacts = 1 << 0,
    Campaigns = 1 << 1,
    Links = 1 << 2,
    Apps = 1 << 3,
}

const userSchema = z.object({
    userId: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.nativeEnum(Role),
    features: z.nativeEnum(Features),
    dateCreated: z.date().optional().default(new Date()),
    dateModified: z.date().optional().default(new Date()),
});

export type User = z.infer<typeof userSchema>;
