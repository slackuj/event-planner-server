import express from "express";
import {config} from "./config";
import {connectDB} from "./configurations/db";
import cors from "cors";
import {errorHandler} from "./middlewares/errorHandler";
import {routes} from "./routes";
import cookieParser from "cookie-parser";
import {logger} from "./utils/logger";
import morgan from "morgan";

export const app = express();

connectDB();

app.use(express.json());

app.use(cookieParser());
const corsOptions = {
    origin: "http://localhost:5173",
    //origin: "https://opencourse-academy.vercel.app",
    credentials: true,// Allow cookies/headers to be sent
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));

const morganStream = { write: (message: string) => logger.http(message.trim())};
app.use(morgan("combined", { stream: morganStream }));

app.listen(config.PORT, () => {
    logger.info(`\nServer started on port ${config.PORT}\n`);
});

app.use("/api", routes);
app.use(errorHandler);