import { MiddlewareHandler } from "hono";
import { Bindings } from "../types";

interface RateLimitOptions {
  limit: number; // Number of requests
  window: number; // Time window in seconds
  keyGenerator?: (c: any) => string;
  skipPaths?: string[];
  skipSuccessfulRequests?: boolean;
}

export const rateLimitMiddleware = (
  options: RateLimitOptions
): MiddlewareHandler<{ Bindings: Bindings }> => {
  const {
    limit,
    window,
    keyGenerator = (c) => {
      const ip =
        c.req.header("CF-Connecting-IP") ||
        c.req.header("X-Forwarded-For") ||
        "unknown";
      return `ratelimit:${ip}:${c.req.path}`;
    },
    skipPaths = [],
    skipSuccessfulRequests = false,
  } = options;

  return async (c, next) => {
    const path = c.req.path;

    // Skip rate limiting for certain paths
    if (skipPaths.some((p) => path.startsWith(p))) {
      return next();
    }

    const key = keyGenerator(c);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;

    try {
      // Get current rate limit data
      const rateLimitData = await c.env.flarebase_KV.get(key);

      let requests: number[] = [];

      if (rateLimitData) {
        try {
          const data = JSON.parse(rateLimitData);
          requests = data.requests || [];
        } catch (error) {
          console.error("Failed to parse rate limit data:", error);
        }
      }

      // Remove old requests outside the current window
      requests = requests.filter((timestamp) => timestamp > windowStart);

      // Check if limit exceeded
      if (requests.length >= limit) {
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + window;

        c.res.headers.set("X-RateLimit-Limit", limit.toString());
        c.res.headers.set("X-RateLimit-Remaining", "0");
        c.res.headers.set("X-RateLimit-Reset", resetTime.toString());
        c.res.headers.set("Retry-After", (resetTime - now).toString());

        return c.json(
          {
            error: "Rate limit exceeded",
            message: `Too many requests. Limit: ${limit} requests per ${window} seconds`,
            retryAfter: resetTime - now,
          },
          429
        );
      }

      // Execute the request
      await next();

      // Only count the request if it's not successful (if skipSuccessfulRequests is true)
      const shouldCount = !skipSuccessfulRequests || c.res.status >= 400;

      if (shouldCount) {
        // Add current request timestamp
        requests.push(now);

        // Store updated rate limit data
        await c.env.flarebase_KV.put(
          key,
          JSON.stringify({
            requests,
            updated_at: new Date().toISOString(),
          }),
          {
            expirationTtl: window + 60, // Extra 60 seconds buffer
          }
        );
      }

      // Add rate limit headers to response
      const remaining = Math.max(0, limit - requests.length);
      const resetTime = Math.min(...requests) + window;

      c.res.headers.set("X-RateLimit-Limit", limit.toString());
      c.res.headers.set("X-RateLimit-Remaining", remaining.toString());
      c.res.headers.set("X-RateLimit-Reset", resetTime.toString());
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      // If rate limiting fails, allow the request to proceed
      return next();
    }
  };
};

// Helper function to clear rate limit for a specific key
export const clearRateLimit = async (env: Bindings, key: string) => {
  try {
    await env.flarebase_KV.delete(key);
    return true;
  } catch (error) {
    console.error("Failed to clear rate limit:", error);
    return false;
  }
};

// Helper function to get current rate limit status
export const getRateLimitStatus = async (
  env: Bindings,
  key: string,
  limit: number,
  window: number
) => {
  try {
    const rateLimitData = await env.flarebase_KV.get(key);

    if (!rateLimitData) {
      return {
        requests: 0,
        remaining: limit,
        resetTime: Math.floor(Date.now() / 1000) + window,
      };
    }

    const data = JSON.parse(rateLimitData);
    const requests = data.requests || [];
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;

    // Filter recent requests
    const recentRequests = requests.filter(
      (timestamp: number) => timestamp > windowStart
    );
    const remaining = Math.max(0, limit - recentRequests.length);
    const resetTime =
      recentRequests.length > 0
        ? Math.min(...recentRequests) + window
        : now + window;

    return {
      requests: recentRequests.length,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error("Failed to get rate limit status:", error);
    return {
      requests: 0,
      remaining: limit,
      resetTime: Math.floor(Date.now() / 1000) + window,
    };
  }
};
