// Cloudflare Workers global types
declare global {
  // WebSocketPair is a global class in Cloudflare Workers
  class WebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }

  interface WebSocket {
    accept(): void;
    send(message: string): void;
    close(code?: number, reason?: string): void;
    addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
    addEventListener(type: "close", listener: (event: CloseEvent) => void): void;
    addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
    readyState: number;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
  }
}

export {};
