import { RealtimeEvent } from "../types";
import "../types/cloudflare";

export class RealtimeSubscription {
  private sessions: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // collection -> sessionIds

  constructor(private ctx: any, private env: any) {}

  async fetch(request: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/publish" && request.method === "POST") {
      return this.handlePublish(request);
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

    server.addEventListener("message", (event: any) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleMessage(sessionId, data);
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
      this.handleDisconnect(sessionId);
    });

    server.addEventListener("error", (error: any) => {
      console.error("WebSocket error:", error);
      this.handleDisconnect(sessionId);
    });

    // Send welcome message
    server.send(
      JSON.stringify({
        type: "connected",
        sessionId,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }

  private handleMessage(sessionId: string, data: any) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (data.type) {
      case "subscribe":
        this.handleSubscribe(sessionId, data.collection);
        break;
      case "unsubscribe":
        this.handleUnsubscribe(sessionId, data.collection);
        break;
      case "ping":
        session.send(
          JSON.stringify({
            type: "pong",
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

  private handleSubscribe(sessionId: string, collection: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!this.subscriptions.has(collection)) {
      this.subscriptions.set(collection, new Set());
    }

    this.subscriptions.get(collection)!.add(sessionId);

    session.send(
      JSON.stringify({
        type: "subscribed",
        collection,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private handleUnsubscribe(sessionId: string, collection: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const subscribers = this.subscriptions.get(collection);
    if (subscribers) {
      subscribers.delete(sessionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(collection);
      }
    }

    session.send(
      JSON.stringify({
        type: "unsubscribed",
        collection,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private handleDisconnect(sessionId: string) {
    this.sessions.delete(sessionId);

    // Remove from all subscriptions
    for (const [collection, subscribers] of this.subscriptions) {
      subscribers.delete(sessionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(collection);
      }
    }
  }

  private async handlePublish(request: Request): Promise<Response> {
    try {
      const event: RealtimeEvent = await request.json();

      const subscribers = this.subscriptions.get(event.collection);
      if (!subscribers || subscribers.size === 0) {
        return new Response(JSON.stringify({ delivered: 0 }));
      }

      let delivered = 0;
      const message = JSON.stringify({
        type: "event",
        ...event,
      });

      for (const sessionId of subscribers) {
        const session = this.sessions.get(sessionId);
        if (session && session.readyState === 1) { // WebSocket.OPEN
          try {
            session.send(message);
            delivered++;
          } catch (error) {
            console.error("Error sending to session:", sessionId, error);
            this.handleDisconnect(sessionId);
          }
        }
      }

      return new Response(JSON.stringify({ delivered }));
    } catch (error) {
      console.error("Error handling publish:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Public method to publish events (called from API)
  async publishEvent(
    collection: string,
    action: string,
    record?: any,
    id?: string
  ) {
    const event: RealtimeEvent = {
      action: action as any,
      collection,
      record,
      id,
      timestamp: new Date().toISOString(),
    };

    return this.handlePublish(
      new Request("http://do/publish", {
        method: "POST",
        body: JSON.stringify(event),
      })
    );
  }
}
