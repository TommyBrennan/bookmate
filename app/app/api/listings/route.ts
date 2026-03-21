import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q")?.trim() || "";
  const meetingFormat = searchParams.get("meeting_format") || "";
  const readingPace = searchParams.get("reading_pace") || "";
  const startDateFrom = searchParams.get("start_date_from") || "";
  const sort = searchParams.get("sort") || "newest";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const conditions: string[] = ["l.is_full = 0"];
  const params: (string | number)[] = [];

  if (q && q.length <= 300) {
    conditions.push("(l.book_title LIKE ? OR l.book_author LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  if (meetingFormat && ["voice", "text", "mixed"].includes(meetingFormat)) {
    conditions.push("l.meeting_format = ?");
    params.push(meetingFormat);
  }

  if (readingPace && readingPace.length <= 200) {
    conditions.push("l.reading_pace LIKE ?");
    params.push(`%${readingPace}%`);
  }

  if (startDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(startDateFrom)) {
    conditions.push("l.start_date >= ?");
    params.push(startDateFrom);
  }

  const whereClause = conditions.join(" AND ");

  let orderClause = "l.created_at DESC";
  if (sort === "oldest") orderClause = "l.created_at ASC";
  else if (sort === "start_date") orderClause = "l.start_date ASC";

  const offset = (page - 1) * PAGE_SIZE;

  // Get total count for pagination metadata
  const countResult = db
    .prepare(
      `SELECT COUNT(*) as total FROM listings l WHERE ${whereClause}`
    )
    .get(...params) as { total: number };

  const listings = db
    .prepare(
      `SELECT
        l.*,
        u.display_name as author_name,
        (SELECT COUNT(*) FROM listing_members WHERE listing_id = l.id) as member_count
      FROM listings l
      JOIN users u ON l.author_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, offset);

  return NextResponse.json({
    listings,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / PAGE_SIZE),
    },
  });
}
