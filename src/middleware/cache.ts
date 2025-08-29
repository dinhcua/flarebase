import { MiddlewareHandler } from "hono";
import { Bindings } from "../types";

interface CacheOptions {
  ttl?: number; // TTL in seconds
  keyGenerator?: (c: any) => string;
  skipCacheHeaders?: string[];
}

export const cacheMiddleware = (
  options: CacheOptions = {}
): MiddlewareHandler<{ Bindings: Bindings }> => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (c) => `cache:${c.req.method}:${c.req.url}`,
    skipCacheHeaders = ["authorization"],
  } = options;

  return async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== "GET") {
      return next();
    }

    // Skip caching if certain headers are present
    const shouldSkip = skipCacheHeaders.some((header) =>
      c.req.header(header.toLowerCase())
    );

    if (shouldSkip) {
      return next();
    }

    const cacheKey = keyGenerator(c);

    try {
      // Try to get from cache first
      const cached = await c.env.flarebase_KV.get(cacheKey);

      if (cached) {
        try {
          const { data, headers, status } = JSON.parse(cached);

          // Set cached headers
          Object.entries(headers).forEach(([key, value]) => {
            c.res.headers.set(key, value as string);
          });

          // Add cache hit header
          c.res.headers.set("X-Cache", "HIT");
          c.res.headers.set("X-Cache-Key", cacheKey);

          return new Response(data, {
            status,
            headers: c.res.headers,
          });
        } catch (error) {
          console.error("Failed to parse cached data:", error);
          // Continue to next() if cache parsing fails
        }
      }

      // Cache miss - execute request
      await next();

      // Only cache successful responses
      if (c.res.status >= 200 && c.res.status < 300) {
        c.executionCtx.waitUntil(cacheResponse(c.env, cacheKey, c.res, ttl));
      }

      // Add cache miss header
      c.res.headers.set("X-Cache", "MISS");
      c.res.headers.set("X-Cache-Key", cacheKey);
    } catch (error) {
      console.error("Cache middleware error:", error);
      return next();
    }
  };
};

async function cacheResponse(
  env: Bindings,
  key: string,
  response: Response,
  ttl: number
) {
  try {
    // Clone response to avoid consuming the stream
    const responseClone = response.clone();
    const data = await responseClone.text();

    // Extract headers to cache
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Skip certain headers that shouldn't be cached
      const skipHeaders = [
        "set-cookie",
        "authorization",
        "x-cache",
        "x-cache-key",
      ];
      if (!skipHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    const cacheData = {
      data,
      headers,
      status: response.status,
      cached_at: new Date().toISOString(),
    };

    await env.flarebase_KV.put(key, JSON.stringify(cacheData), {
      expirationTtl: ttl,
    });
  } catch (error) {
    console.error("Failed to cache response:", error);
  }
}

// Cache invalidation helper
export const invalidateCache = async (env: Bindings, pattern: string) => {
  try {
    // List all keys matching pattern
    const list = await env.flarebase_KV.list({ prefix: `cache:${pattern}` });

    // Delete matching keys
    const deletePromises = list.keys.map((key) =>
      env.flarebase_KV.delete(key.name)
    );

    await Promise.all(deletePromises);

    return list.keys.length;
  } catch (error) {
    console.error("Failed to invalidate cache:", error);
    return 0;
  }
};
