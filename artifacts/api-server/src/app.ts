import express, { type Express } from "express";
import cors from "cors";
import pinoHttpModule from "pino-http";
const pinoHttp = pinoHttpModule as any;
import path from "path";
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

const publicDir = path.resolve("public");

// The types here are automatically inferred by Express, so they don't need manual typing
app.get(["/app", "/app/", "/app/index.html"], (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use("/app", express.static(publicDir, { maxAge: 0, etag: false }));

export default app;
