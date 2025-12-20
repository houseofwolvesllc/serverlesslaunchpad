import { z } from "zod";
import { Role } from "@houseofwolves/serverlesslaunchpad.core";

/**
 * Zod schemas for users endpoints
 */

/**
 * GET /users/{userId}
 * Retrieves user profile information
 */
export const UserSchema = z.object({
    params: z.object({
        userId: z.string().min(1, "User ID is required"),
    }),
});

/**
 * PUT /users/{userId}
 * Updates user profile information
 *
 * Authorization:
 * - Users can update their own firstName/lastName
 * - Admins can update any user's firstName/lastName
 * - Only admins can update role and features
 */
export const UpdateUserSchema = z.object({
    params: z.object({
        userId: z.string().min(1, "User ID is required"),
    }),
    body: z
        .object({
            firstName: z
                .string()
                .min(1, "First name is required")
                .max(100, "First name must be less than 100 characters")
                .optional(),
            lastName: z
                .string()
                .min(1, "Last name is required")
                .max(100, "Last name must be less than 100 characters")
                .optional(),
            role: z
                .union([
                    z.nativeEnum(Role),
                    z.string()
                ], { errorMap: () => ({ message: "Invalid role value" }) })
                .optional(),
            features: z
                .union([
                    z.number().int("Features must be an integer")
                        .min(0, "Features cannot be negative")
                        .max(15, "Invalid feature flags"),
                    z.array(z.string())
                ])
                .optional(),
        })
        .refine(
            (data) => data.firstName !== undefined || data.lastName !== undefined || data.role !== undefined || data.features !== undefined,
            { message: "At least one field must be provided for update" }
        ),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;

/**
 * POST /users/list
 * Retrieves paginated list of all users (Admin only)
 *
 * Authorization: Admin role required
 */
export const GetUsersSchema = z.object({
    body: z.object({
        // Accept pagination instruction as plain JSON object
        pagingInstruction: z.any().optional(),
    }),
});

export type GetUsersRequest = z.infer<typeof GetUsersSchema>;
