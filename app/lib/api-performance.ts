import { recordResponseTime, metrics } from "./metrics";

/**
 * Wraps an API route handler with performance monitoring
 * Tracks response times, errors, and slow requests
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();

    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;

      // Record response time for metrics
      recordResponseTime(duration);
      metrics.requestCount++;

      // Track slow requests (>200ms for API, >1s already tracked in metrics.ts)
      if (duration > 200 && duration <= 1000) {
        console.warn(`[PERF] Slow API request: ${routeName} took ${duration}ms`);
      }

      // Add performance header to response (only in development)
      if (process.env.NODE_ENV === "development") {
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("X-Response-Time", `${duration}ms`);
        return newResponse as Awaited<ReturnType<T>>;
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.errors++;
      console.error(`[PERF] Error in ${routeName} after ${duration}ms:`, error);
      throw error;
    }
  }) as T;
}

/**
 * Wraps a database query with performance tracking
 * Logs slow queries (>100ms)
 */
export function trackQuery<T>(
  queryName: string,
  queryFn: () => T
): T {
  const startTime = Date.now();
  try {
    const result = queryFn();
    const duration = Date.now() - startTime;

    if (duration > 100) {
      console.warn(`[PERF] Slow DB query: ${queryName} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PERF] Error in ${queryName} after ${duration}ms:`, error);
    throw error;
  }
}
