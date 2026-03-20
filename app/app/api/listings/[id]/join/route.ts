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

  // Wrap count check + insert in a transaction to prevent race conditions
  const joinTransaction = db.transaction(() => {
    const { count } = db
      .prepare("SELECT COUNT(*) as count FROM listing_members WHERE listing_id = ?")
      .get(listingId) as { count: number };

    if (count >= (listing.max_group_size as number)) {
      return { error: "This group is already full", count };
    }

    db.prepare(
      "INSERT INTO listing_members (listing_id, user_id) VALUES (?, ?)"
    ).run(listingId, session.userId);

    const newCount = count + 1;
    if (newCount >= (listing.max_group_size as number)) {
      db.prepare("UPDATE listings SET is_full = 1 WHERE id = ?").run(listingId);
    }

    return { error: null, count: newCount };
  });

  const result = joinTransaction();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Notify outside the transaction (fire-and-forget)
  notifyListingAuthor(listingId, session.displayName || "Someone");

  if (result.count === (listing.max_group_size as number)) {
    notifyGroupFull(listingId);
  }

  return NextResponse.json({ ok: true, memberCount: result.count });
}
