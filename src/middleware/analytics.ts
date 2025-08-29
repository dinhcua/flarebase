import { MiddlewareHandler } from "hono";
import { Bindings } from "../types";

export const analyticsMiddleware = (): MiddlewareHandler<{
  Bindings: Bindings;
}> => {
  return async (c, next) => {
    const start = Date.now();

    // Extract request info
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown";
    const country = c.req.header("CF-IPCountry") || "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";
    const path = c.req.path;
    const method = c.req.method;
    const timestamp = new Date().toISOString();

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Skip analytics for certain paths
    const skipPaths = ["/health", "/metrics", "/favicon.ico"];
    if (skipPaths.some((p) => path.startsWith(p))) {
      return;
    }

    try {
      // Store analytics data in background
      c.executionCtx.waitUntil(
        storeAnalytics(c.env, {
          ip,
          country,
          userAgent,
          path,
          method,
          status,
          duration,
          timestamp,
        })
      );
    } catch (error) {
      console.error("Analytics middleware error:", error);
    }
  };
};

async function storeAnalytics(
  env: Bindings,
  data: {
    ip: string;
    country: string;
    userAgent: string;
    path: string;
    method: string;
    status: number;
    duration: number;
    timestamp: string;
  }
) {
  try {
    // Store in D1 database (tracking table)
    await env.DB.prepare(
      `
      INSERT INTO tracking (ip, country, user_agent, path, method, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        data.ip,
        data.country,
        data.userAgent,
        data.path,
        data.method,
        data.timestamp
      )
      .run();

    // Also store aggregated data in KV for quick access
    const key = `analytics:${new Date().toISOString().split("T")[0]}`; // Daily aggregation
    const existing = await env.flarebase_KV.get(key);

    let analytics = {
      date: new Date().toISOString().split("T")[0],
      requests: 0,
      unique_ips: new Set(),
      paths: {} as Record<string, number>,
      methods: {} as Record<string, number>,
      status_codes: {} as Record<string, number>,
      countries: {} as Record<string, number>,
      avg_duration: 0,
      total_duration: 0,
    };

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        analytics = {
          ...parsed,
          unique_ips: new Set(parsed.unique_ips || []),
        };
      } catch (error) {
        console.error("Failed to parse existing analytics:", error);
      }
    }

    // Update analytics
    analytics.requests++;
    analytics.unique_ips.add(data.ip);
    analytics.paths[data.path] = (analytics.paths[data.path] || 0) + 1;
    analytics.methods[data.method] = (analytics.methods[data.method] || 0) + 1;
    analytics.status_codes[data.status.toString()] =
      (analytics.status_codes[data.status.toString()] || 0) + 1;
    analytics.countries[data.country] =
      (analytics.countries[data.country] || 0) + 1;
    analytics.total_duration += data.duration;
    analytics.avg_duration = analytics.total_duration / analytics.requests;

    // Convert Set back to array for JSON serialization
    const toStore = {
      ...analytics,
      unique_ips: Array.from(analytics.unique_ips),
      unique_ip_count: analytics.unique_ips.size,
    };

    await env.flarebase_KV.put(key, JSON.stringify(toStore), {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days
    });
  } catch (error) {
    console.error("Failed to store analytics:", error);
  }
}
