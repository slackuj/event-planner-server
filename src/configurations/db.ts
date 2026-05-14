import knex from 'knex';
// @ts-ignore
import knexConfig from "../knexfile";
import {logger} from "../utils/logger";

export const database = knex(knexConfig.development);

export const connectDB = async () => {
    try {
        // check connection
        await database.raw('SELECT 1');
        logger.info("Database connection established successfully.");
    } catch (error) {
        logger.error("Database connection failed:", error);
        process.exit(1);
    }
};