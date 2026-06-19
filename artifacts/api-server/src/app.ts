import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pino from "pino";
import router from "./routes";
import { logger } from "./lib/logger";

// ── Startup env var checks ────────────────────────────────
const requiredWhatsAppVars = [
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  "FACEBOOK_APP_SECRET",
];

for (const v of requiredWhatsAppVars) {
  if (!process.env[v]) {
    logger.warn(
      `Missing env var: ${v} — WhatsApp webhook functionality will be degraded. Set it in your environment secrets.`,
    );
  }
}

const app: Express = express();

// FIX: create instance properly
const loggerMiddleware = pino();

app.use((req: any, res: any, next: any) => {
  req.log = loggerMiddleware;

  loggerMiddleware.info({
    method: req.method,
    url: req.url?.split("?")[0],
  });

  next();
});

app.use(cors({ credentials: true, origin: true }));

app.use(
  express.json({
    limit: "15mb",
    verify: (req: any, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use("/api", router);

export default app;
