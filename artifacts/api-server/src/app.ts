import express, { type Express } from "express";
import cors from "cors";
import pinoHttpModule from "pino-http";
const pinoHttp = pinoHttpModule as any;
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      // Explicitly typed as 'any' to fix TS7006 and accommodate the custom req.id
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      // Explicitly typed as 'any' to fix TS7006
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
