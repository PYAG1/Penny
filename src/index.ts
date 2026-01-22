import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { searchRouter } from "./routes/v1/search.routes";
import openApiApp from "./lib/docs/openapi";
import { contentsRouter } from "./routes/v1/contents.route";


const app = new Hono();


app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "AI Drive Search API",
    version: "1.0.0",
  });
});

app.route("/api/content", contentsRouter);
app.route("/api/search", searchRouter);

// Mount documentation routes
app.route("/api/v1", openApiApp);

export default app;
