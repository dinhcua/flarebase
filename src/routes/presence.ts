import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Bindings, PresenceUser } from "../types";

const presenceRouter = new Hono<{ Bindings: Bindings }>();

// Presence status schema
const statusSchema = z.object({
  status: z.enum(["online", "away", "busy", "offline"]),
  metadata: z.record(z.any()).optional(),
});

// Get WebSocket URL for presence connection
presenceRouter.get("/connect", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.json(
      {
        error: "WebSocket upgrade required",
        websocketUrl: "/api/presence/connect",
      },
      400
    );
  }

  try {
    // Create unique DO instance for this user/session
    const userId = c.req.query("userId") || "anonymous";
    const id = c.env.flarebase_PRESENCE.idFromName(userId);
    const stub = c.env.flarebase_PRESENCE.get(id);

    return stub.fetch(c.req.raw);
  } catch (error) {
    console.error("Failed to establish presence connection:", error);
    return c.json({ error: "Failed to establish connection" }, 500);
  }
});

// Get online users
presenceRouter.get("/users", async (c) => {
  try {
    // Get presence data from KV (cached by DO)
    const presenceData = await c.env.flarebase_KV.get("presence_users");

    if (!presenceData) {
      return c.json({ users: [], count: 0 });
    }

    const users = JSON.parse(presenceData);
    const onlineUsers = users.filter(
      (user: PresenceUser) =>
        user.status !== "offline" &&
        new Date().getTime() - new Date(user.lastSeen).getTime() < 300000 // 5 minutes
    );

    return c.json({
      users: onlineUsers,
      count: onlineUsers.length,
      total: users.length,
    });
  } catch (error) {
    console.error("Failed to get online users:", error);
    return c.json({ error: "Failed to get online users" }, 500);
  }
});

// Update user status
presenceRouter.post("/status", zValidator("json", statusSchema), async (c) => {
  try {
    const { status, metadata } = c.req.valid("json");
    const userId = c.req.query("userId") || "anonymous";

    // Update user status via Durable Object
    const id = c.env.flarebase_PRESENCE.idFromName(userId);
    const stub = c.env.flarebase_PRESENCE.get(id);

    const response = await stub.fetch(
      new Request("http://do/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status, metadata }),
      })
    );

    if (!response.ok) {
      throw new Error("Failed to update status in DO");
    }

    return c.json({
      message: "Status updated successfully",
      userId,
      status,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to update status:", error);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// Get specific user presence
presenceRouter.get("/users/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    // Get presence data from KV
    const presenceData = await c.env.flarebase_KV.get("presence_users");

    if (!presenceData) {
      return c.json({ error: "User not found" }, 404);
    }

    const users = JSON.parse(presenceData);
    const user = users.find((u: PresenceUser) => u.id === userId);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if user is considered online (last seen within 5 minutes)
    const isOnline =
      new Date().getTime() - new Date(user.lastSeen).getTime() < 300000;

    return c.json({
      ...user,
      isOnline,
      lastSeenAgo: new Date().getTime() - new Date(user.lastSeen).getTime(),
    });
  } catch (error) {
    console.error("Failed to get user presence:", error);
    return c.json({ error: "Failed to get user presence" }, 500);
  }
});

// Disconnect user (mark as offline)
presenceRouter.post("/disconnect", async (c) => {
  try {
    const userId = c.req.query("userId") || "anonymous";

    // Update user status to offline via Durable Object
    const id = c.env.flarebase_PRESENCE.idFromName(userId);
    const stub = c.env.flarebase_PRESENCE.get(id);

    const response = await stub.fetch(
      new Request("http://do/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
    );

    if (!response.ok) {
      throw new Error("Failed to disconnect in DO");
    }

    return c.json({
      message: "User disconnected successfully",
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to disconnect user:", error);
    return c.json({ error: "Failed to disconnect user" }, 500);
  }
});

export { presenceRouter };
