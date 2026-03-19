import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const listings = db
    .prepare(
      `SELECT
        l.*,
        u.display_name as author_name,
        (SELECT COUNT(*) FROM listing_members WHERE listing_id = l.id) as member_count
      FROM listings l
      JOIN users u ON l.author_id = u.id
      WHERE l.is_full = 0
      ORDER BY l.created_at DESC`
    )
    .all();

  return NextResponse.json({ listings });
}
