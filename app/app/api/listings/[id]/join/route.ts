import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { notifyListingAuthor, notifyGroupFull } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const listing = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(listingId) as Record<string, unknown> | undefined;

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Author is already a member — don't allow re-joining
  if (listing.author_id === session.userId) {
    return NextResponse.json({ error: "You are the organizer of this group" }, { status: 400 });
  }

  if (listing.requires_approval) {
    return NextResponse.json(
      { error: "This group requires approval. Please apply instead." },
      { status: 400 }
    );
  }

  if (listing.is_full) {
    return NextResponse.json({ error: "This group is already full" }, { status: 400 });
  }

  // Check if already a member
  const existing = db
    .prepare(
      "SELECT 1 FROM listing_members WHERE listing_id = ? AND user_id = ?"
    )
    .get(listingId, session.userId);

  if (existing) {
    return NextResponse.json({ error: "You are already a member" }, { status: 400 });
  }

  // Check if user has a pending application (e.g., requires_approval was toggled off)
  const pendingApp = db
    .prepare(
      "SELECT 1 FROM listing_applications WHERE listing_id = ? AND user_id = ? AND status = 'pending'"
    )
    .get(listingId, session.userId);

  if (pendingApp) {
    return NextResponse.json(
      { error: "You already have a pending application for this group" },
      { status: 400 }
    );
  }

  // Wrap count check + insert in a transaction to prevent race conditions
  // Re-read max_group_size inside the transaction to avoid stale data from concurrent PATCH
  const joinTransaction = db.transaction(() => {
    const freshListing = db
      .prepare("SELECT max_group_size FROM listings WHERE id = ?")
      .get(listingId) as { max_group_size: number } | undefined;

    if (!freshListing) {
      return { error: "Listing not found", count: 0, maxSize: 0 };
    }

    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM listing_members WHERE listing_id = ?")
      .get(listingId) as { count: number };

    if (count >= freshListing.max_group_size) {
      return { error: "This group is already full", count, maxSize: freshListing.max_group_size };
    }

    db.prepare(
      "INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)"
    ).run(listingId, session.userId);

    const newCount = count + 1;
    if (newCount >= freshListing.max_group_size) {
      db.prepare("UPDATE listings SET is_full = 1 WHERE id = ?").run(listingId);
    }

    return { error: null, count: newCount, maxSize: freshListing.max_group_size };
  });

  const result = joinTransaction();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Notify outside the transaction (fire-and-forget)
  // When group just filled, skip new_member notification for the author
  // since they'll receive the more important group_full notification instead
  if (result.count === result.maxSize) {
    notifyGroupFull(
      listingId,
      listing.book_title as string,
      listing.platform_preference as string
    );
  } else {
    notifyListingAuthor(listingId, session.displayName || "Someone");
  }

  return NextResponse.json({ ok: true, memberCount: result.count });
}
