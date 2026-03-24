import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { metrics, recordResponseTime, getAverageResponseTime, getP95ResponseTime, formatUptime } from "@/lib/metrics";

const startTime = Date.now();

export async function GET(_request: Request) {
  const requestStart = Date.now();

  try {
    // Check database connectivity with timing
    const dbStart = Date.now();
    const dbCheck = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
    const dbTime = Date.now() - dbStart;
    const dbOk = dbCheck?.ok === 1;

    const response: Record<string, unknown> = {
      status: "healthy",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: {
        status: dbOk ? "connected" : "error",
        queryTime: dbTime,
      },
      timestamp: new Date().toISOString(),
    };

    // Only expose detailed metrics to authenticated admins
    try {
      const session = await getSession();
      if (session?.userId) {
        // Get database stats
        const stats = db.prepare(`
          SELECT
            (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM listings) AS listings,
            (SELECT COUNT(*) FROM listings WHERE is_full = 0) AS open_listings,
            (SELECT COUNT(*) FROM listing_members) AS total_memberships,
            (SELECT COUNT(*) FROM notifications WHERE read = 0) AS unread_notifications
        `).get() as {
          users: number;
          listings: number;
          open_listings: number;
          total_memberships: number;
          unread_notifications: number;
        };

        // Get database file size
        const dbStats = db.prepare("PRAGMA page_count").get() as { page_count: number };
        const pageSize = db.prepare("PRAGMA page_size").get() as { page_size: number };
        const dbSize = (dbStats.page_count * pageSize.page_size) / 1024; // KB

        // Update metrics
        metrics.requestCount++;
        const requestTime = Date.now() - requestStart;
        recordResponseTime(requestTime);

        response.metrics = {
          requests: {
            total: metrics.requestCount,
            errors: metrics.errors,
            slowQueries: metrics.slowQueries,
          },
          database: {
            size: `${Math.round(dbSize)} KB`,
            stats: {
              users: stats.users,
              listings: stats.listings,
              openListings: stats.open_listings,
              totalMemberships: stats.total_memberships,
              unreadNotifications: stats.unread_notifications,
            },
          },
          performance: {
            avgResponseTime: getAverageResponseTime(),
            p95ResponseTime: getP95ResponseTime(),
            sampleSize: metrics.requestCount,
          },
          uptime: {
            seconds: Math.floor((Date.now() - startTime) / 1000),
            formatted: formatUptime(Math.floor((Date.now() - startTime) / 1000)),
          },
        };
      }
    } catch {
      // Session check failed — skip detailed metrics
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        uptime: Math.floor((Date.now() - startTime) / 1000),
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
