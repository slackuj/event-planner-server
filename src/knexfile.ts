import {config} from "./config";
const knexConfig = {
    development: {
        client: "mysql2",
        connection: {
            host: config.MYSQL_URI,
            user: config.MYSQL_USER,
            password: config.MYSQL_PASSWORD,
            database: config.MYSQL_DATABASE,
        },
        migrations: {
            // Ensure this directory exists or Knex can create it
            directory: "./database/migrations",
            extension: "ts",
        },
        seeds: {
            // Ensure this directory exists or Knex can create it
            directory: "./database/seeds",
            extension: "ts",
        },
    },
};

export default knexConfig;