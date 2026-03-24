import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

interface ReadingRow {
  id: number;
  book_title: string;
  book_author: string;
  book_cover_url: string;
  reading_pace: string;
  start_date: string;
  meeting_format: string;
  is_full: number;
  telegram_link: string;
  discord_link: string;
  member_count: number;
  max_group_size: number;
  author_name: string;
  joined_at: string;
}

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Get all listings the user is a member of (including ones they authored)
  const readings = db.prepare(`
    SELECT
      l.id,
      l.book_title,
      l.book_author,
      l.book_cover_url,
      l.reading_pace,
      l.start_date,
      l.meeting_format,
      l.is_full,
      l.telegram_link,
      l.discord_link,
      l.max_group_size,
      u.display_name as author_name,
      lm.joined_at,
      (SELECT COUNT(*) FROM listing_members WHERE listing_id = l.id) as member_count
    FROM listing_members lm
    JOIN listings l ON l.id = lm.listing_id
    JOIN users u ON u.id = l.author_id
    WHERE lm.user_id = ?
    ORDER BY lm.joined_at DESC
  `).all(session.userId) as ReadingRow[];

  const today = new Date().toISOString().split("T")[0];

  // Reading history: completed groups (full + start_date in the past)
  // Upcoming: not yet started and not full
  // Active: everything else that has started or is full (but not completed)
  const isHistory = (r: ReadingRow) => r.is_full === 1 && r.start_date < today;
  const isUpcoming = (r: ReadingRow) => r.is_full === 0 && r.start_date > today;

  const history = readings.filter(isHistory);
  const upcoming = readings.filter(isUpcoming);
  const active = readings.filter(
    (r) => !isHistory(r) && !isUpcoming(r) && (r.is_full === 1 || r.start_date <= today)
  );

  return NextResponse.json({
    active,
    history,
    upcoming,
    total: readings.length,
  });
}
