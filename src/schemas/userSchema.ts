import { z } from "zod";

/**
 * Schema for updating user profile details
 * Matches UpdateUserRequest in user.ts
 */
export const UpdateUserRequestSchema = z.object({
    name: z.string()
        .min(5, "Name must be at least 5 characters long")
        .max(50, "Name is too long")
        .optional(),
    profile_picture: z.url("Invalid image URL")
        .optional().nullable(),
});

/**
 * Schema for user ID parameter validation
 */
export const UserIdParamsSchema = z.object({
    user_id: z.coerce.number("User ID must be a number")
        .positive("Username must be a positive number"),
});