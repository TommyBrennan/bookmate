import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/ratings — Submit a rating for a group member
 *
 * Body: { listingId, ratedUserId, score (1-5), comment? }
 *
 * Rules:
 * - Both rater and rated must be members of the listing
 * - The listing must be full (group completed)
 * - Cannot rate yourself
 * - One rating per rater-rated pair per listing (can update)
 */
export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { listingId, ratedUserId, score, comment } = body;

  if (listingId == null || ratedUserId == null || score == null) {
    return NextResponse.json(
      { error: "listingId, ratedUserId, and score are required" },
      { status: 400 }
    );
  }

  // Validate listingId and ratedUserId are positive integers
  if (typeof listingId !== "number" || !Number.isInteger(listingId) || listingId < 1) {
    return NextResponse.json(
      { error: "Invalid listingId" },
      { status: 400 }
    );
  }

  if (typeof ratedUserId !== "number" || !Number.isInteger(ratedUserId) || ratedUserId < 1) {
    return NextResponse.json(
      { error: "Invalid ratedUserId" },
      { status: 400 }
    );
  }

  if (score < 1 || score > 5 || !Number.isInteger(score)) {
    return NextResponse.json(
      { error: "Score must be an integer between 1 and 5" },
      { status: 400 }
    );
  }

  if (ratedUserId === session.userId) {
    return NextResponse.json(
      { error: "You cannot rate yourself" },
      { status: 400 }
    );
  }

  if (comment && comment.length > 1000) {
    return NextResponse.json(
      { error: "Comment must be at most 1000 characters" },
      { status: 400 }
    );
  }

  // Verify listing exists and is full
  const listing = db
    .prepare("SELECT id, book_title, is_full FROM listings WHERE id = ?")
    .get(listingId) as { id: number; book_title: string; is_full: number } | undefined;

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  if (!listing.is_full) {
    return NextResponse.json(
      { error: "Ratings are only available for completed reading groups" },
      { status: 400 }
    );
  }

  // Verify both users are members
  const raterMember = db
    .prepare(
      "SELECT 1 FROM listing_members WHERE listing_id = ? AND user_id = ?"
    )
    .get(listingId, session.userId);

  if (!raterMember) {
    return NextResponse.json(
      { error: "You must be a member of this group to rate" },
      { status: 403 }
    );
  }

  const ratedMember = db
    .prepare(
      "SELECT 1 FROM listing_members WHERE listing_id = ? AND user_id = ?"
    )
    .get(listingId, ratedUserId);

  if (!ratedMember) {
    return NextResponse.json(
      { error: "The user you are rating must be a member of this group" },
      { status: 400 }
    );
  }

  // Upsert rating (update if exists)
  const existing = db
    .prepare(
      "SELECT id FROM ratings WHERE listing_id = ? AND rater_id = ? AND rated_user_id = ?"
    )
    .get(listingId, session.userId, ratedUserId) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE ratings SET score = ?, comment = ?, created_at = datetime('now') WHERE id = ?"
    ).run(score, comment || "", existing.id);
  } else {
    db.prepare(
      "INSERT INTO ratings (listing_id, rater_id, rated_user_id, score, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(listingId, session.userId, ratedUserId, score, comment || "");

    // Notify the rated user
    createNotification(
      ratedUserId,
      listingId,
      "rating_received",
      `Someone rated your participation in "${listing.book_title}"`
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/ratings?listingId=X — Get ratings for a listing
 *
 * Returns ratings the current user has given and received in a listing,
 * plus the members who can still be rated.
 */
export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const listingIdParam = req.nextUrl.searchParams.get("listingId");
  if (!listingIdParam) {
    return NextResponse.json(
      { error: "listingId parameter required" },
      { status: 400 }
    );
  }
  const listingId = parseInt(listingIdParam, 10);
  if (isNaN(listingId)) {
    return NextResponse.json(
      { error: "Invalid listingId" },
      { status: 400 }
    );
  }

  // Verify the current user is a member of this listing
  const isMember = db
    .prepare("SELECT 1 FROM listing_members WHERE listing_id = ? AND user_id = ?")
    .get(listingId, session.userId);
  if (!isMember) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  // Ratings the current user has given in this listing
  const givenRatings = db
    .prepare(
      `SELECT r.rated_user_id, r.score, r.comment, u.display_name
       FROM ratings r
       JOIN users u ON r.rated_user_id = u.id
       WHERE r.listing_id = ? AND r.rater_id = ?`
    )
    .all(listingId, session.userId) as {
      rated_user_id: number;
      score: number;
      comment: string;
      display_name: string;
    }[];

  // Ratings the current user has received in this listing
  const receivedRatings = db
    .prepare(
      `SELECT r.rater_id, r.score, r.comment, u.display_name
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       WHERE r.listing_id = ? AND r.rated_user_id = ?`
    )
    .all(listingId, session.userId) as {
      rater_id: number;
      score: number;
      comment: string;
      display_name: string;
    }[];

  return NextResponse.json({
    givenRatings,
    receivedRatings,
  });
}
