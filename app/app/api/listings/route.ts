import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

const PAGE_SIZE = 20;

/** Escape LIKE metacharacters so user input is matched literally */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q")?.trim() || "";
  const meetingFormat = searchParams.get("meeting_format") || "";
  const readingPace = searchParams.get("reading_pace") || "";
  const startDateFrom = searchParams.get("start_date_from") || "";
  const sort = searchParams.get("sort") || "newest";
  const includePast = searchParams.get("include_past") === "true";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : Math.min(pageParam, 1000);

  const conditions: string[] = ["l.is_full = 0"];
  const params: (string | number)[] = [];

  // Apply date floor: use the more restrictive of today or startDateFrom
  const today = new Date().toISOString().split("T")[0];
  const hasStartDateFilter = startDateFrom && /^\d{4}-\d{2}-\d{2}$/.test(startDateFrom);

  if (!includePast) {
    // Use whichever is later: today or the explicit start_date_from filter
    const effectiveDate = hasStartDateFilter && startDateFrom > today ? startDateFrom : today;
    conditions.push("l.start_date >= ?");
    params.push(effectiveDate);
  } else if (hasStartDateFilter) {
    // includePast is true, but user wants a specific start date floor
    conditions.push("l.start_date >= ?");
    params.push(startDateFrom);
  }

  if (q && q.length <= 300) {
    conditions.push("(l.book_title LIKE ? ESCAPE '\\' OR l.book_author LIKE ? ESCAPE '\\')");
    params.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`);
  }

  if (meetingFormat && ["voice", "text", "mixed"].includes(meetingFormat)) {
    conditions.push("l.meeting_format = ?");
    params.push(meetingFormat);
  }

  if (readingPace && readingPace.length <= 200) {
    conditions.push("l.reading_pace LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(readingPace)}%`);
  }

  const whereClause = conditions.join(" AND ");

  const ORDER_MAP: Record<string, string> = {
    newest: "l.created_at DESC",
    oldest: "l.created_at ASC",
    start_date: "l.start_date ASC",
  };
  const orderClause = ORDER_MAP[sort] ?? "l.created_at DESC";

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
