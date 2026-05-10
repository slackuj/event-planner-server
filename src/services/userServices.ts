import { database } from "../configurations/db";
import { logger } from "../utils/logger";
import { UpdateUserRequest, User } from "../types/user"; //

/**
 * Fetches a user by their numeric ID.
 */
export const fetchUserById = async (user_id: number) => {
    const user = await database<User>("users")
        .where({ id: user_id })
        .first();

    if (!user) {
        logger.error(`[USER-SERVICES] [FETCH] User not found: ${user_id}`);
        throw new Error("User not found");
    }

    const { password, ...User } = user;
    return User;
};

/**
 * Updates user profile details (name, profile_picture, etc.)
 */
export const updateUserById = async (user_id: number, data: Partial<UpdateUserRequest>) => {
    const [updatedUser] = await database<User>("users")
        .where({ id: user_id })
        .update(data)
        .returning("*"); // Returns the updated record

    if (!updatedUser) {
        logger.error(`[USER-SERVICES] [UPDATE] Failed to update non-existent user: ${user_id}`);
        throw new Error("User does not exist!");
    }

    const { password, ...UpdatedUser } = updatedUser;
    logger.info(`[USER-SERVICES] [UPDATE BY ID] user updated: ${user_id}`);
    return UpdatedUser;
};