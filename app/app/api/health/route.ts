import { NextResponse } from "next/server";
import db from "@/lib/db";

const startTime = Date.now();

export async function GET() {
  try {
    // Check database connectivity
    const dbCheck = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
    const dbOk = dbCheck?.ok === 1;

    // Get basic stats
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM listings) AS listings,
        (SELECT COUNT(*) FROM listings WHERE is_full = 0) AS open_listings
    `).get() as { users: number; listings: number; open_listings: number };

    return NextResponse.json({
      status: "healthy",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbOk ? "connected" : "error",
      stats: {
        users: stats.users,
        listings: stats.listings,
        openListings: stats.open_listings,
      },
      timestamp: new Date().toISOString(),
    });
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
