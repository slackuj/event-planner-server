import {UserSession} from "../types/user";
import {logger} from "../utils/logger";
import {database} from "../configurations/db";

/**
 * Creates a new session in the database.
 * Maps UserSession interface properties to database snake_case columns.
 */
export const createSession = async (data: UserSession) => {
    const { user_id, refresh_token, expires_at } = data;

    const [session] = await database<UserSession>("user_sessions")
        .insert({
            user_id: user_id,
            refresh_token: refresh_token,
            expires_at: expires_at,
        })
        .returning("*");

    logger.info(`[SESSION-SERVICES] [CREATE] session created: user: ${user_id}`);
    return session;
};

/**
 * Deletes a session by its refresh token.
 */
export const deleteSessionByToken = async (refresh_token: string) => {
    await database("user_sessions")
        .where({ refresh_token: refresh_token })
        .del();

    logger.info(`[SESSION-SERVICES] [DELETE BY TOKEN] user sessions deleted`);
};

/**
 * Finds a session by its refresh token.
 */
export const findSessionByToken = async (refresh_token: string) => (
    database<UserSession>("user_sessions")
        .where({refresh_token: refresh_token})
        .first()
);