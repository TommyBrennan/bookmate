import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const notifications = db
    .prepare(
      `SELECT n.*, l.book_title
       FROM notifications n
       LEFT JOIN listings l ON n.listing_id = l.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`
    )
    .all(session.userId);

  const unreadCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0"
    )
    .get(session.userId) as { count: number };

  return NextResponse.json({
    notifications,
    unreadCount: unreadCount.count,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { notificationId } = body;

  if (notificationId) {
    // Validate notificationId is a positive integer
    if (typeof notificationId !== "number" || !Number.isInteger(notificationId) || notificationId < 1) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }
    db.prepare(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?"
    ).run(notificationId, session.userId);
  } else {
    // Mark all as read — use subquery with LIMIT to bound WAL lock duration
    db.prepare(
      `UPDATE notifications SET is_read = 1
       WHERE id IN (
         SELECT id FROM notifications
         WHERE user_id = ? AND is_read = 0
         LIMIT 1000
       )`
    ).run(session.userId);
  }

  return NextResponse.json({ ok: true });
}
