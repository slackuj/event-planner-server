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

    const { password, role, updated_at, ...User } = user;
    return User;
};

export const fetchUserIdByEmail = async (email: string) => {
    const user = await database<User>("users")
        .where({email: email, role: "USER"})
        .select("id")
        .first();

    if (!user) {
        logger.error(`[USER-SERVICES] [FETCH-USER-ID-BY-EMAIL] User not found: ${email}`);
        throw new Error("User not found");
    }

    return user.id;
};

/**
 * Updates user profile details (name, profile_picture, etc.)
 */
export const updateUserById = async (user_id: number, data: Partial<UpdateUserRequest>) => {
    // HANDLE ROW === 0 LATER
    const updatedRow = await database<User>("users")
        .where({ id: user_id })
        .update(data);

    const updatedUser = await fetchUserById(user_id);
    if (!updatedUser) {
        logger.error(`[USER-SERVICES] [UPDATE] Failed to update non-existent user: ${user_id}`);
        throw new Error("User does not exist!");
    }

    logger.info(`[USER-SERVICES] [UPDATE-BY-ID] user updated: ${user_id}`);
    return updatedUser;
};