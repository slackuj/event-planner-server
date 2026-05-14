import {config} from "./config";
const knexConfig = {
    development: {
        client: "mysql2",
        connection: {
            host: "127.0.0.1",
            user: config.MYSQL_USER,
            password: config.MYSQL_PASSWORD,
            database: config.MYSQL_DATABASE,
        },
        migrations: {
            // Ensure this directory exists or Knex can create it
            directory: "./database/migrations",
            extension: "ts",
        },
    },
};

export default knexConfig;