import { Bindings, RealtimeEvent } from "../types";

export class RealtimeService {
  constructor(private env: Bindings) {}

  /**
   * Publish an event to all subscribers of a collection
   */
  async publishEvent(
    collection: string,
    action: "create" | "update" | "delete",
    record?: any,
    id?: string
  ): Promise<number> {
    try {
      const event: RealtimeEvent = {
        action,
        collection,
        record,
        id,
        timestamp: new Date().toISOString(),
      };

      // Get all active realtime Durable Object instances
      // For simplicity, we'll use a single shared instance
      const doId = this.env.flarebase_REALTIME.idFromName("shared");
      const stub = this.env.flarebase_REALTIME.get(doId);

      const response = await stub.fetch(
        new Request("http://do/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        })
      );

      if (!response.ok) {
        throw new Error(`Failed to publish event: ${response.statusText}`);
      }

      const result = (await response.json()) as { delivered: number };
      return result.delivered;
    } catch (error) {
      console.error("Failed to publish realtime event:", error);
      return 0;
    }
  }

  /**
   * Get WebSocket URL for realtime connections
   */
  getWebSocketUrl(): string {
    return "/api/realtime";
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch(
    events: Array<{
      collection: string;
      action: "create" | "update" | "delete";
      record?: any;
      id?: string;
    }>
  ): Promise<number> {
    let totalDelivered = 0;

    for (const event of events) {
      const delivered = await this.publishEvent(
        event.collection,
        event.action,
        event.record,
        event.id
      );
      totalDelivered += delivered;
    }

    return totalDelivered;
  }

  /**
   * Subscribe to collection changes (creates DO instance if needed)
   */
  async subscribeToCollection(collection: string): Promise<string> {
    try {
      const doId = this.env.flarebase_REALTIME.idFromName("shared");
      const stub = this.env.flarebase_REALTIME.get(doId);

      // Initialize the DO by calling websocket endpoint
      const response = await stub.fetch(
        new Request("http://do/websocket", {
          headers: { Upgrade: "websocket" },
        })
      );

      return this.getWebSocketUrl();
    } catch (error) {
      console.error("Failed to setup collection subscription:", error);
      throw error;
    }
  }

  /**
   * Get statistics about active connections
   */
  async getConnectionStats(): Promise<{
    totalConnections: number;
    subscriptionsByCollection: Record<string, number>;
  }> {
    try {
      const doId = this.env.flarebase_REALTIME.idFromName("shared");
      const stub = this.env.flarebase_REALTIME.get(doId);

      const response = await stub.fetch(new Request("http://do/stats"));

      if (!response.ok) {
        return {
          totalConnections: 0,
          subscriptionsByCollection: {},
        };
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get connection stats:", error);
      return {
        totalConnections: 0,
        subscriptionsByCollection: {},
      };
    }
  }
}
