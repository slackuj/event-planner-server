import express from "express";
import cors from "cors";
import {config} from "./config";
import {errorHandler} from "./middlewares/errorHandler";
import {routes} from "./routes";

export const app = express();

app.use(express.json());
//app.use(cors(corsOptions));
app.use(cors());

app.listen(config.PORT, () => {
    console.log(`Server started on port ${config.PORT}`);
});

app.use("/api", routes);
app.use(errorHandler);