import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
})

const consoleFormat = combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
);

const fileFormat = combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
);

const transportsList : InstanceType<typeof transports.Console | typeof transports.File>[] = [
    new transports.Console({ format: consoleFormat }),
]

transportsList.push(new transports.File({ filename: "logs/error.log", level: "error", format: fileFormat }));
transportsList.push(new transports.File({ filename: "logs/combined.log", format: fileFormat }));

export const logger = createLogger({
    //level:  process.env.NODE_ENV === "production" ? "info" : "debug",
    level:  "http",
    levels: {...require("winston").config.npm.levels, http: 3}, // Adding custom 'http' level with highest priority
    transports: transportsList,
});

export const errorLogger = createLogger({
    level: "error",
    transports: transportsList,
});

export const warnLogger = createLogger({
    level: "warn",
    transports: transportsList,
});

export const debugLogger = createLogger({
    level: "debug",
    transports: transportsList,
});