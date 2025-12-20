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
            firstName: z.preprocess(
                (val) => (val === "" ? undefined : val),
                z.string()
                    .min(1, "First name is required")
                    .max(100, "First name must be less than 100 characters")
                    .optional()
            ),
            lastName: z.preprocess(
                (val) => (val === "" ? undefined : val),
                z.string()
                    .min(1, "Last name is required")
                    .max(100, "Last name must be less than 100 characters")
                    .optional()
            ),
            role: z
                .nativeEnum(Role, {
                    errorMap: () => ({ message: "Invalid role value" }),
                })
                .optional(),
            features: z
                .array(z.string())
                .optional(),
        }),
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
