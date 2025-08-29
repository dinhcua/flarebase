import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jwt } from "hono/jwt";
import { Bindings } from "./types";

// Import Durable Objects
import { RealtimeSubscription } from "./durable_objects/realtime";
import { UserPresence } from "./durable_objects/presence";

// Import routes
import { authRouter } from "./routes/auth";
import { collectionsRouter } from "./routes/collections";
import { storageRouter } from "./routes/storage";
import { backupRouter } from "./routes/backup";
import { settingsRouter } from "./routes/settings";
import { presenceRouter } from "./routes/presence";

// Import middleware
import { analyticsMiddleware } from "./middleware/analytics";
import { cacheMiddleware } from "./middleware/cache";
import { rateLimitMiddleware } from "./middleware/rate-limit";

// Create main Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("*", logger());
app.use("*", analyticsMiddleware());

// Rate limiting for auth endpoints
app.use(
  "/api/auth/*",
  rateLimitMiddleware({
    limit: 10,
    window: 60, // 10 requests per minute
  })
);

// JWT protection for protected routes
app.use("/api/collections/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const token = authHeader.substring(7);
    const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET });
    return jwtMiddleware(c, next);
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Cache middleware for collections (read operations only)
app.use(
  "/api/collections/*/records",
  cacheMiddleware({
    ttl: 30, // 30 seconds
    keyGenerator: (c) => `collection:${c.req.param("collection")}:${c.req.url}`,
  })
);

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    name: "flarebase",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.route("/api/auth", authRouter);
app.route("/api/collections", collectionsRouter);
app.route("/api/storage", storageRouter);
app.route("/api/backup", backupRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/presence", presenceRouter);

// Realtime WebSocket endpoint
app.get("/api/realtime", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.json(
      {
        error: "WebSocket upgrade required",
        websocketUrl: "/api/realtime",
      },
      400
    );
  }

  const id = c.env.flarebase_REALTIME.newUniqueId();
  const stub = c.env.flarebase_REALTIME.get(id);
  return stub.fetch(c.req.raw);
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: "The requested endpoint does not exist",
      status: 404,
    },
    404
  );
});

// Error handler
app.onError((error, c) => {
  console.error("Error:", error);
  return c.json(
    {
      error: "Internal Server Error",
      message: error.message || "Something went wrong",
      status: 500,
    },
    500
  );
});

// Export Durable Objects
export { RealtimeSubscription, UserPresence };

export default app;
