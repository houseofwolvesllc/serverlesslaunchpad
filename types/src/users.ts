import { z } from "zod";

const userSchema = z.object({
    userId: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
});

export type User = z.infer<typeof userSchema>;
