import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = db
    .prepare(
      `SELECT
        l.*,
        u.display_name as author_name
      FROM listings l
      JOIN users u ON l.author_id = u.id
      WHERE l.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const members = db
    .prepare(
      `SELECT u.id, u.display_name, u.bio, lm.joined_at
       FROM listing_members lm
       JOIN users u ON lm.user_id = u.id
       WHERE lm.listing_id = ?
       ORDER BY lm.joined_at ASC`
    )
    .all(id) as { id: number; display_name: string; bio: string; joined_at: string }[];

  const session = await getSession();
  const isMember = session.userId
    ? members.some((m) => m.id === session.userId)
    : false;
  const isAuthor = session.userId
    ? listing.author_id === session.userId
    : false;

  return NextResponse.json({
    listing: {
      ...listing,
      members,
      memberCount: members.length,
      isMember,
      isAuthor,
    },
  });
}
