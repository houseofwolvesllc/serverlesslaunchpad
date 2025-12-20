import { z } from "zod";

export enum Roles {
    Base = 0,
    Admin = 1 << 0,
}

export enum Features {
    Base = 0,
    Works = 1 << 0,
}

const userSchema = z.object({
    userId: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    roles: z.array(z.nativeEnum(Roles)),
    features: z.array(z.nativeEnum(Features)),
    dateCreated: z.date().optional().default(new Date()),
    dateModified: z.date().optional().default(new Date()),
});

export type User = z.infer<typeof userSchema>;
