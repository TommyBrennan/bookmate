import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

const startTime = Date.now();

export async function GET() {
  try {
    // Check database connectivity
    const dbCheck = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
    const dbOk = dbCheck?.ok === 1;

    const response: Record<string, unknown> = {
      status: "healthy",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbOk ? "connected" : "error",
      timestamp: new Date().toISOString(),
    };

    // Only expose detailed stats to authenticated users
    try {
      const session = await getSession();
      if (session?.userId) {
        const stats = db.prepare(`
          SELECT
            (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM listings) AS listings,
            (SELECT COUNT(*) FROM listings WHERE is_full = 0) AS open_listings
        `).get() as { users: number; listings: number; open_listings: number };

        response.stats = {
          users: stats.users,
          listings: stats.listings,
          openListings: stats.open_listings,
        };
      }
    } catch {
      // Session check failed (e.g., no cookies context) — skip stats
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
