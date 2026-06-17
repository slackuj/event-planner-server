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
            directory: "./database/migrations",
            extension: "ts",
        },
        seeds: {
            directory: "./database/seeds",
            extension: "ts",
        },
    },
};

export default knexConfig;