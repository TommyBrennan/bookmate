import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { isBotConfigured } from "@/lib/telegram";

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

  // Check if the current user has a pending application
  let hasApplied = false;
  let applicationStatus = "";
  if (session.userId && !isMember && listing.requires_approval) {
    const app = db
      .prepare(
        "SELECT status FROM listing_applications WHERE listing_id = ? AND user_id = ?"
      )
      .get(id, session.userId) as { status: string } | undefined;
    if (app) {
      hasApplied = app.status === "pending";
      applicationStatus = app.status;
    }
  }

  // Fetch pending applicants if the viewer is the author
  let pendingApplicants: { application_id: number; id: number; display_name: string; bio: string; applied_at: string }[] = [];
  if (isAuthor && listing.requires_approval) {
    pendingApplicants = db
      .prepare(
        `SELECT la.id as application_id, u.id, u.display_name, u.bio, la.applied_at
         FROM listing_applications la
         JOIN users u ON la.user_id = u.id
         WHERE la.listing_id = ? AND la.status = 'pending'
         ORDER BY la.applied_at ASC`
      )
      .all(id) as { application_id: number; id: number; display_name: string; bio: string; applied_at: string }[];
  }

  return NextResponse.json({
    listing: {
      ...listing,
      members,
      memberCount: members.length,
      isMember,
      isAuthor,
      hasApplied,
      applicationStatus,
      pendingApplicants,
      currentUserId: session.userId || null,
      telegramBotConfigured: isBotConfigured(),
    },
  });
}
