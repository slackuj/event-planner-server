import {UserSession} from "../types/user";
import {logger} from "../utils/logger";
import {database} from "../configurations/db";
import { Knex } from "knex";

export const createSession = async (data: UserSession, trx?: Knex.Transaction) => {
    const { user_id, refresh_token, expires_at } = data;
    const qb = trx ? trx("user_sessions") : database("user_sessions");

    const [session] = await qb.insert({
        user_id,
        refresh_token,
        expires_at,
    });

    logger.info(`[SESSION-SERVICES] [CREATE] session created: user: ${user_id}`);
    return session;
};

export const deleteSessionByToken = async (refresh_token: string) => {
    await database("user_sessions")
        .where({ refresh_token: refresh_token })
        .del();

    logger.info(`[SESSION-SERVICES] [DELETE BY TOKEN] user sessions deleted`);
};

// delete sessions by userId
export const deleteSessionsByUserId = async (user_id: number, trx?: Knex.Transaction) => {
    const qb = trx ? trx("user_sessions") : database("user_sessions");

    await qb.where({ user_id: user_id }).del();

    logger.info(`[SESSION-SERVICES] [DELETE BY USER ID] user sessions deleted`);
};

/**
 * Finds a session by its refresh token.
 */
export const findSessionByToken = async (refresh_token: string) => (
    database<UserSession>("user_sessions")
        .where({refresh_token: refresh_token})
        .first()
);