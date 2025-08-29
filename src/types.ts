// Cloudflare Worker Environment Bindings
export interface Bindings {
  // D1 Database
  flarebase: any; // D1Database from Cloudflare Workers

  // KV Storage
  flarebase_KV: any; // KVNamespace from Cloudflare Workers

  // R2 Storage (optional - needs to be enabled in dashboard)
  R2_BUCKET?: any; // R2Bucket from Cloudflare Workers

  // Durable Objects
  flarebase_REALTIME: any; // DurableObjectNamespace from Cloudflare Workers
  flarebase_PRESENCE: any; // DurableObjectNamespace from Cloudflare Workers

  // Environment Variables
  JWT_SECRET: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Collection types
export interface Collection {
  id: string;
  name: string;
  schema: string; // JSON schema
  created_at: string;
  updated_at: string;
}

// File types
export interface FileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  is_public: boolean;
  user_id?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

// Event types
export interface EventRecord {
  id: number;
  event_name: string;
  event_category?: string;
  event_label?: string;
  event_value?: number;
  properties?: string; // JSON string
  user_id?: string;
  session_id?: string;
  timestamp: string;
  url?: string;
  user_agent?: string;
}

// Realtime types
export interface RealtimeEvent<T = any> {
  action: "create" | "update" | "delete";
  collection: string;
  record?: T;
  id?: string;
  timestamp: string;
}

// Presence types
export interface PresenceUser {
  id: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen: string;
  metadata?: Record<string, any>;
}

export interface PresenceEvent {
  type: "statusChange" | "userJoined" | "userLeft";
  user: PresenceUser;
  timestamp: string;
}

// API Response types
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

// Query types
export interface QueryOptions {
  page?: number;
  perPage?: number;
  sort?: string;
  filter?: string;
}

// Settings types
export interface SystemSettings {
  [key: string]: any;
}
