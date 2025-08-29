import { PresenceUser, PresenceEvent } from "../types";
import "../types/cloudflare";

export class UserPresence {
  private sessions: Map<string, WebSocket> = new Map();
  private users: Map<string, PresenceUser> = new Map();
  private sessionToUser: Map<string, string> = new Map();

  constructor(private ctx: any, private env: any) {
    // Restore users from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get("users");
      if (stored) {
        this.users = new Map(
          Object.entries(stored as Record<string, PresenceUser>)
        );
      }
    });
  }

  async fetch(request: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/update-status" && request.method === "POST") {
      return this.handleUpdateStatus(request);
    }

    if (url.pathname === "/disconnect" && request.method === "POST") {
      return this.handleDisconnect(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair) as [WebSocket, WebSocket];

    server.accept();

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, server);

    // Get userId from query params
    const urlParams = new URL(request.url);
    const userId = urlParams.searchParams.get("userId") || `user_${sessionId}`;
    this.sessionToUser.set(sessionId, userId);

    // Initialize user if not exists
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        status: "online",
        lastSeen: new Date().toISOString(),
        metadata: {},
      });
      await this.persistUsers();
    } else {
      // Update existing user to online
      const user = this.users.get(userId)!;
      user.status = "online";
      user.lastSeen = new Date().toISOString();
      await this.persistUsers();
    }

    server.addEventListener("message", (event: any) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleMessage(sessionId, userId, data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        server.send(
          JSON.stringify({
            type: "error",
            message: "Invalid JSON format",
          })
        );
      }
    });

    server.addEventListener("close", () => {
      this.handleUserDisconnect(sessionId, userId);
    });

    server.addEventListener("error", (error: any) => {
      console.error("WebSocket error:", error);
      this.handleUserDisconnect(sessionId, userId);
    });

    // Send welcome message with current user list
    server.send(
      JSON.stringify({
        type: "connected",
        userId,
        sessionId,
        users: Array.from(this.users.values()),
        timestamp: new Date().toISOString(),
      })
    );

    // Broadcast user joined event
    this.broadcastEvent(
      {
        type: "userJoined",
        user: this.users.get(userId)!,
        timestamp: new Date().toISOString(),
      },
      sessionId
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }

  private async handleMessage(sessionId: string, userId: string, data: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (data.type) {
      case "updateStatus":
        await this.updateUserStatus(userId, data.status, data.metadata);
        break;
      case "ping":
        session.send(
          JSON.stringify({
            type: "pong",
            timestamp: new Date().toISOString(),
          })
        );
        // Update last seen
        const user = this.users.get(userId);
        if (user) {
          user.lastSeen = new Date().toISOString();
          await this.persistUsers();
        }
        break;
      case "getUsers":
        session.send(
          JSON.stringify({
            type: "userList",
            users: Array.from(this.users.values()),
            timestamp: new Date().toISOString(),
          })
        );
        break;
      default:
        session.send(
          JSON.stringify({
            type: "error",
            message: "Unknown message type",
          })
        );
    }
  }

  private async updateUserStatus(
    userId: string,
    status: string,
    metadata?: any
  ) {
    const user = this.users.get(userId);
    if (!user) return;

    const oldStatus = user.status;
    user.status = status as any;
    user.lastSeen = new Date().toISOString();

    if (metadata) {
      user.metadata = { ...user.metadata, ...metadata };
    }

    await this.persistUsers();

    // Broadcast status change
    if (oldStatus !== status) {
      this.broadcastEvent({
        type: "statusChange",
        user,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleUserDisconnect(sessionId: string, userId: string) {
    this.sessions.delete(sessionId);
    this.sessionToUser.delete(sessionId);

    // Check if user has other active sessions
    const hasOtherSessions = Array.from(this.sessionToUser.values()).includes(
      userId
    );

    if (!hasOtherSessions) {
      const user = this.users.get(userId);
      if (user) {
        user.status = "offline";
        user.lastSeen = new Date().toISOString();
        await this.persistUsers();

        // Broadcast user left event
        this.broadcastEvent({
          type: "userLeft",
          user,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private broadcastEvent(event: PresenceEvent, excludeSession?: string) {
    const message = JSON.stringify({
      ...event,
    });

    for (const [sessionId, session] of this.sessions) {
      if (sessionId === excludeSession) continue;

      if (session.readyState === 1) { // WebSocket.OPEN
        try {
          session.send(message);
        } catch (error) {
          console.error("Error broadcasting to session:", sessionId, error);
          this.sessions.delete(sessionId);
        }
      }
    }
  }

  private async persistUsers() {
    try {
      // Convert Map to Object for storage
      const usersObject = Object.fromEntries(this.users);
      await this.ctx.storage.put("users", usersObject);

      // Also update KV for external access
      await this.env.flarebase_KV.put(
        "presence_users",
        JSON.stringify(Array.from(this.users.values())),
        {
          expirationTtl: 300, // 5 minutes
        }
      );
    } catch (error) {
      console.error("Error persisting users:", error);
    }
  }

  private async handleUpdateStatus(request: Request): Promise<Response> {
    try {
      const { userId, status, metadata } = await request.json();
      await this.updateUserStatus(userId, status, metadata);

      return new Response(
        JSON.stringify({
          success: true,
          user: this.users.get(userId),
        })
      );
    } catch (error) {
      console.error("Error updating status:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  private async handleDisconnect(request: Request): Promise<Response> {
    try {
      const { userId } = await request.json();

      // Find and close all sessions for this user
      const sessionsToClose = [];
      for (const [sessionId, currentUserId] of this.sessionToUser) {
        if (currentUserId === userId) {
          sessionsToClose.push(sessionId);
        }
      }

      for (const sessionId of sessionsToClose) {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.close();
        }
        await this.handleUserDisconnect(sessionId, userId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          disconnectedSessions: sessionsToClose.length,
        })
      );
    } catch (error) {
      console.error("Error disconnecting user:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
}
